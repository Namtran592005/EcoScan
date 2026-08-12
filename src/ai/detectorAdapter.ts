import {
  DETECT_CONFIDENCE_THRESHOLD,
  DETECT_INPUT_SIZE,
  DETECT_MAX_BOXES,
  DETECT_MIN_BOX_SIZE,
  DETECT_NMS_IOU,
  ONNX_EXECUTION_PROVIDERS,
} from '@/data/thresholds';
import {
  detectionLabelForIndex,
  type WasteClassId,
} from '@/data/detectionLabels';
import { getOnnxRuntime, type OnnxRuntimeBinding } from './onnxRuntime';
import { rgbaToNormalizedNchw } from './preprocessing';
import { processDetectionOutput } from './postprocessing';
import type {
  DetectionBox,
  ModelRuntimeInfo,
  RgbaImage,
  WasteDetector,
} from './types';

const INPUT_NAME = 'images';
const OUTPUT_NAME = 'output0';
const NUM_CLASSES = 8;

/**
 * ONNX wrapper for the YOLO11n detection model (`yolo11_trash_detection.onnx`).
 * Input: [1,3,640,640] → Output: [1, 4+NUM_CLASSES, 8400].
 */
export class OnnxWasteDetector implements WasteDetector {
  readonly kind = 'detector' as const;
  readonly modelPath: string;
  runtime: ModelRuntimeInfo = { status: 'loading' };

  private ort: OnnxRuntimeBinding | null;
  private session: Awaited<
    ReturnType<OnnxRuntimeBinding['InferenceSession']['create']>
  > | null = null;

  constructor(modelPath: string) {
    this.modelPath = modelPath;
    this.ort = getOnnxRuntime();
    this.runtime = { status: 'loading', modelPath, inputSize: DETECT_INPUT_SIZE };
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
          intraOpNumThreads: 3,
          graphOptimizationLevel: 'all',
        });
        this.runtime = {
          status: 'ready',
          modelPath: this.modelPath,
          inputSize: DETECT_INPUT_SIZE,
          executionProvider: ep,
        };
        return;
      } catch (error) {
        lastError = error as Error;
      }
    }

    this.runtime = {
      status: 'error',
      modelPath: this.modelPath,
      inputSize: DETECT_INPUT_SIZE,
      error:
        'Không thể tải mô hình phát hiện. ' +
        (lastError?.message ? `(${lastError.message})` : 'Vui lòng thử lại.'),
    };
    throw new Error(this.runtime.error);
  }

  async detect(image: RgbaImage): Promise<DetectionBox[]> {
    if (!this.ort || !this.session) {
      throw new Error('Detector session not loaded.');
    }
    const input = rgbaToNormalizedNchw(image, DETECT_INPUT_SIZE);
    const tensor = new this.ort.Tensor(
      'float32',
      input,
      [1, 3, DETECT_INPUT_SIZE, DETECT_INPUT_SIZE],
    );
    const results = await this.session.run({ [INPUT_NAME]: tensor });
    const output = results[OUTPUT_NAME];
    const data = output.data as Float32Array;

    return processDetectionOutput(
      data,
      DETECT_INPUT_SIZE,
      NUM_CLASSES,
      {
        confThreshold: DETECT_CONFIDENCE_THRESHOLD,
        iouThreshold: DETECT_NMS_IOU,
        maxBoxes: DETECT_MAX_BOXES,
        minBoxSize: DETECT_MIN_BOX_SIZE,
      },
      (index) => {
        const label: WasteClassId = detectionLabelForIndex(index);
        return label;
      },
    );
  }

  async dispose(): Promise<void> {
    this.session?.release();
    this.session = null;
  }
}