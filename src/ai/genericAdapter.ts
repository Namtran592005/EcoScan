import {
  DETECT_CONFIDENCE_THRESHOLD,
  DETECT_MAX_BOXES,
  DETECT_MIN_BOX_SIZE,
  DETECT_NMS_IOU,
  ONNX_EXECUTION_PROVIDERS,
} from '@/data/thresholds';
import { getOnnxRuntime, type OnnxRuntimeBinding } from './onnxRuntime';
import { rgbaToNormalized } from './preprocessing';
import { processDetectionOutput, softmaxTop1 } from './postprocessing';
import type {
  ClassificationResult,
  DetectionBox,
  ModelRuntimeInfo,
  RgbaImage,
  WasteClassifier,
  WasteDetector,
} from './types';

/**
 * Generic ONNX wrapper for any user-imported model.
 *
 * The model's role (classifier vs detector), input size and class count come
 * from probing the session metadata at load time, so no bundled model or
 * hardcoded shape is required.
 *
 * - Classifier output: [1, N]. If the values are already a probability
 *   distribution (softmax baked into the graph) we read argmax directly,
 *   otherwise we apply softmax in JS.
 * - Detector output:  [1, 4+N, A] (channels-first, YOLOv8/11 style) or the
 *   transposed [1, A, 4+N]; coordinates are normalized by the input size.
 */
export class OnnxImportModel implements WasteClassifier, WasteDetector {
  readonly kind: 'classifier' | 'detector';
  readonly modelPath: string;
  runtime: ModelRuntimeInfo = { status: 'loading' };

  private ort: OnnxRuntimeBinding | null;
  private session: Awaited<
    ReturnType<OnnxRuntimeBinding['InferenceSession']['create']>
  > | null = null;
  private inputSize = 0;
  private numClasses = 0;
  private inputName = '';
  private outputName = '';
  /** Memory layout of the model input tensor. */
  private inputLayout: 'nchw' | 'nhwc' = 'nchw';
  private layout: 'channels-first' | 'channels-last' = 'channels-first';
  /** Feed raw [0,255] pixels (Keras/tf2onnx rescale internally) or [0,1]. */
  private normalizeInput: boolean;
  /** True when the caller explicitly chose a normalization mode. */
  private normalizeInputExplicit = false;

  constructor(
    modelPath: string,
    kind: 'classifier' | 'detector',
    options?: { normalizeInput?: boolean },
  ) {
    this.modelPath = modelPath;
    this.kind = kind;
    if (options?.normalizeInput !== undefined) {
      this.normalizeInput = options.normalizeInput;
      this.normalizeInputExplicit = true;
    } else {
      this.normalizeInput = true;
    }
    this.ort = getOnnxRuntime();
    this.runtime = { status: 'loading', modelPath };
  }

  async load(): Promise<void> {
    if (!this.ort) {
      this.runtime = {
        status: 'unavailable',
        modelPath: this.modelPath,
        error:
          'ONNX Runtime chưa khả dụng. Cần chạy bằng Development Build ' +
          '(không chạy trong Expo Go) — xem README.',
      };
      throw new Error('ONNX Runtime native module unavailable');
    }

    let lastError: Error | null = null;
    for (const ep of ONNX_EXECUTION_PROVIDERS) {
      try {
        this.session = await this.ort.InferenceSession.create(this.modelPath, {
          executionProviders: [ep],
          intraOpNumThreads: this.kind === 'detector' ? 3 : 2,
          graphOptimizationLevel: 'all',
        });
        this.readShape();
        this.runtime = {
          status: 'ready',
          modelPath: this.modelPath,
          inputSize: this.inputSize,
          executionProvider: ep,
        };
        return;
      } catch (error) {
        lastError = error as Error;
        this.session?.release();
        this.session = null;
      }
    }

    this.runtime = {
      status: 'error',
      modelPath: this.modelPath,
      inputSize: this.inputSize || undefined,
      error:
        'Không thể tải mô hình. ' +
        (lastError?.message ? `(${lastError.message})` : 'Vui lòng thử lại.'),
    };
    throw new Error(this.runtime.error);
  }

  /** Read input/output names + shapes from the session metadata. */
  private readShape(): void {
    if (!this.session) return;
    const inputMeta = this.session.inputMetadata[0];
    const outputMeta = this.session.outputMetadata[0];
    this.inputName = inputMeta?.name ?? this.session.inputNames[0] ?? 'images';
    this.outputName =
      outputMeta?.name ?? this.session.outputNames[0] ?? 'output0';

    const inShape = inputMeta?.isTensor ? (inputMeta.shape ?? []) : [];
    // Detect memory layout from the raw shape: [N,H,W,3] is channels-last
    // (tf2onnx MobileNet), [N,3,H,W] is channels-first (YOLO). The batch dim
    // may be symbolic, so only the channel position matters.
    const last = inShape[inShape.length - 1];
    this.inputLayout = last === 3 && inShape.length === 4 ? 'nhwc' : 'nchw';
    // Channels-last inputs are typically Keras/tf2onnx exports that rescale
    // pixels inside the graph (Rescaling layer); feed raw [0,255]. Channels-
    // first (YOLO/Ultralytics) expects normalized [0,1].
    if (!this.normalizeInputExplicit) {
      this.normalizeInput = this.inputLayout !== 'nhwc';
    }
    // Square input edge: channels-last → dim 1 (H), channels-first → dim 2 (H).
    const h =
      this.inputLayout === 'nhwc'
        ? numAt(inShape, 1)
        : numAt(inShape, 2);
    this.inputSize = h > 0 ? h : 224;

    const outShape = outputMeta?.isTensor ? (outputMeta.shape ?? []) : [];
    if (outShape.length === 2) {
      // Classifier: [N, classes] — batch may be symbolic.
      this.layout = 'channels-first';
      this.numClasses = numAt(outShape, 1) || 1;
    } else if (outShape.length === 3) {
      // Detector: [1, 4+N, A] (channels-first) or [1, A, 4+N] (channels-last).
      const a = numAt(outShape, 1);
      const b = numAt(outShape, 2);
      if (a >= b) {
        this.layout = 'channels-last';
        this.numClasses = Math.max(1, b - 4);
      } else {
        this.layout = 'channels-first';
        this.numClasses = Math.max(1, a - 4);
      }
    } else {
      this.numClasses = 1;
    }
  }

  async classify(image: RgbaImage): Promise<ClassificationResult> {
    if (this.kind !== 'classifier') {
      throw new Error('Model này không phải model phân loại.');
    }
    if (!this.ort || !this.session) {
      throw new Error('Classifier session not loaded.');
    }
    const input = rgbaToNormalized(
      image,
      this.inputSize,
      this.inputLayout,
      this.normalizeInput,
    );
    const tensor = new this.ort.Tensor(
      'float32',
      input,
      this.tensorShape(),
    );
    const results = await this.session.run({ [this.inputName]: tensor });
    const output = results[this.outputName];
    const data = output.data as Float32Array;

    const { index, probability } = isProbabilityDistribution(data)
      ? argmax(data)
      : softmaxTop1(data);

    return { className: `class_${index}`, confidence: probability };
  }

  async detect(image: RgbaImage): Promise<DetectionBox[]> {
    if (this.kind !== 'detector') {
      throw new Error('Model này không phải model phát hiện.');
    }
    if (!this.ort || !this.session) {
      throw new Error('Detector session not loaded.');
    }
    const input = rgbaToNormalized(
      image,
      this.inputSize,
      this.inputLayout,
      this.normalizeInput,
    );
    const tensor = new this.ort.Tensor(
      'float32',
      input,
      this.tensorShape(),
    );
    const results = await this.session.run({ [this.inputName]: tensor });
    const output = results[this.outputName];
    let data = output.data as Float32Array;

    if (this.layout === 'channels-last') {
      data = transposeToChannelsFirst(data, this.numClasses);
    }

    return processDetectionOutput(
      data,
      this.inputSize,
      this.numClasses,
      {
        confThreshold: DETECT_CONFIDENCE_THRESHOLD,
        iouThreshold: DETECT_NMS_IOU,
        maxBoxes: DETECT_MAX_BOXES,
        minBoxSize: DETECT_MIN_BOX_SIZE,
      },
      (index) => `class_${index}`,
    );
  }

  async dispose(): Promise<void> {
    this.session?.release();
    this.session = null;
  }

  /** Input tensor dimensions matching the detected model layout. */
  private tensorShape(): number[] {
    return this.inputLayout === 'nhwc'
      ? [1, this.inputSize, this.inputSize, 3]
      : [1, 3, this.inputSize, this.inputSize];
  }
}

/** Values look like a probability distribution (softmax already applied). */
function isProbabilityDistribution(data: Float32Array): boolean {  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v < 0 || v > 1.0001) return false;
    sum += v;
  }
  return Math.abs(sum - 1) < 0.01;
}

function argmax(
  data: Float32Array,
): { index: number; probability: number } {
  let bestIndex = 0;
  let bestProb = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > bestProb) {
      bestProb = data[i];
      bestIndex = i;
    }
  }
  return { index: bestIndex, probability: bestProb };
}

/** Convert [1, A, 4+N] (anchors-last) into [4+N, A] for post-processing. */
function transposeToChannelsFirst(
  data: Float32Array,
  numClasses: number,
): Float32Array {
  const width = 4 + numClasses;
  const anchors = data.length / width;
  if (!Number.isInteger(anchors)) return data;
  const out = new Float32Array(data.length);
  for (let a = 0; a < anchors; a++) {
    for (let r = 0; r < width; r++) {
      out[r * anchors + a] = data[a * width + r];
    }
  }
  return out;
}

/** Numeric value at `index`, or 0 when the dim is symbolic or out of range. */
function numAt(shape: readonly (number | string)[], index: number): number {
  const d = shape[index];
  return typeof d === 'number' && Number.isFinite(d) ? d : 0;
}
