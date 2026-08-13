import {
  DETECT_CONFIDENCE_THRESHOLD,
  DETECT_MAX_BOXES,
  DETECT_MIN_BOX_SIZE,
  DETECT_NMS_IOU,
  ONNX_EXECUTION_PROVIDERS,
} from '@/data/thresholds';
import { getOnnxRuntime, type OnnxRuntimeBinding } from './onnxRuntime';
import { rgbaToNormalizedNchw } from './preprocessing';
import { processDetectionOutput, softmaxTop1 } from './postprocessing';
import type {
  ClassificationResult,
  DetectionBox,
  ModelRuntimeInfo,
  RgbaImage,
  WasteClassifier,
  WasteDetector,
} from './types';
import type { InferenceSession } from 'onnxruntime-common';

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
  private layout: 'channels-first' | 'channels-last' = 'channels-first';

  constructor(modelPath: string, kind: 'classifier' | 'detector') {
    this.modelPath = modelPath;
    this.kind = kind;
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

    const inShape = numericShape(inputMeta);
    const h = inShape.length === 4 ? inShape[2] : 0;
    this.inputSize = h > 0 ? h : 224;

    const outShape = numericShape(outputMeta);
    if (outShape.length === 2) {
      this.layout = 'channels-first';
      this.numClasses = outShape[1] ?? 1;
    } else if (outShape.length === 3) {
      // Larger dim = anchors; smaller = 4 + numClasses.
      const a = outShape[1];
      const b = outShape[2];
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
    const input = rgbaToNormalizedNchw(image, this.inputSize);
    const tensor = new this.ort.Tensor(
      'float32',
      input,
      [1, 3, this.inputSize, this.inputSize],
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
    const input = rgbaToNormalizedNchw(image, this.inputSize);
    const tensor = new this.ort.Tensor(
      'float32',
      input,
      [1, 3, this.inputSize, this.inputSize],
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

/** Keep only the concrete integer dimensions of a (possibly symbolic) shape. */
function numericShape(
  meta: InferenceSession.ValueMetadata | undefined,
): number[] {
  if (!meta || !meta.isTensor) return [];
  return meta.shape.filter((d): d is number => typeof d === 'number');
}
