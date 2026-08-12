import { CLASSIFY_INPUT_SIZE, ONNX_EXECUTION_PROVIDERS } from '@/data/thresholds';
import {
  CLASSIFY_LABELS,
  type WasteClassId,
} from '@/data/detectionLabels';
import { getOnnxRuntime, type OnnxRuntimeBinding } from './onnxRuntime';
import { rgbaToNormalizedNchw } from './preprocessing';
import { softmaxTop1 } from './postprocessing';
import type {
  ClassificationResult,
  ModelRuntimeInfo,
  RgbaImage,
  WasteClassifier,
} from './types';

const INPUT_NAME = 'images';
const OUTPUT_NAME = 'output0';

/**
 * ONNX wrapper for the YOLOv8n classification model (`wastewise-yolo.onnx`).
 * Input: [1,3,224,224] → Output: [1,8] (logits over the 8 waste classes).
 */
export class OnnxWasteClassifier implements WasteClassifier {
  readonly kind = 'classifier' as const;
  readonly modelPath: string;
  runtime: ModelRuntimeInfo = { status: 'loading' };

  private ort: OnnxRuntimeBinding | null;
  private session: Awaited<
    ReturnType<OnnxRuntimeBinding['InferenceSession']['create']>
  > | null = null;

  constructor(modelPath: string) {
    this.modelPath = modelPath;
    this.ort = getOnnxRuntime();
    this.runtime = { status: 'loading', modelPath, inputSize: CLASSIFY_INPUT_SIZE };
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
          intraOpNumThreads: 2,
          graphOptimizationLevel: 'all',
        });
        this.runtime = {
          status: 'ready',
          modelPath: this.modelPath,
          inputSize: CLASSIFY_INPUT_SIZE,
          executionProvider: ep,
        };
        return;
      } catch (error) {
        lastError = error as Error;
        // Try the next execution provider.
      }
    }

    this.runtime = {
      status: 'error',
      modelPath: this.modelPath,
      inputSize: CLASSIFY_INPUT_SIZE,
      error:
        'Không thể tải mô hình phân loại. ' +
        (lastError?.message ? `(${lastError.message})` : 'Vui lòng thử lại.'),
    };
    throw new Error(this.runtime.error);
  }

  async classify(image: RgbaImage): Promise<ClassificationResult> {
    if (!this.ort || !this.session) {
      throw new Error('Classifier session not loaded.');
    }
    const input = rgbaToNormalizedNchw(image, CLASSIFY_INPUT_SIZE);
    const tensor = new this.ort.Tensor(
      'float32',
      input,
      [1, 3, CLASSIFY_INPUT_SIZE, CLASSIFY_INPUT_SIZE],
    );
    const results = await this.session.run({ [INPUT_NAME]: tensor });
    const output = results[OUTPUT_NAME];
    const data = output.data as Float32Array;
    const { index, probability } = softmaxTop1(data);
    const className: WasteClassId = CLASSIFY_LABELS[index] ?? 'trash';
    return { className, confidence: probability };
  }

  async dispose(): Promise<void> {
    this.session?.release();
    this.session = null;
  }
}