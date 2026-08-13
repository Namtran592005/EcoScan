/**
 * Model adapter contracts.
 *
 * The UI only ever talks to these interfaces — the ONNX implementation behind
 * them can be swapped (different model, different runtime) without touching any
 * screen component.
 */

/** Raw image passed to an adapter: RGBA (non-premultiplied) byte data. */
export interface RgbaImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface ClassificationResult {
  /** AI class key, e.g. "plastic" (see data/wasteRules.ts). */
  className: string;
  /** Softmax confidence in [0, 1]. */
  confidence: number;
}

/**
 * Detected object, coordinates are normalized to the model input space
 * (0..1). The caller maps them to screen coordinates.
 */
export interface DetectionBox {
  className: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Runtime health reported to the UI/debug overlay. */
export interface ModelRuntimeInfo {
  /** 'ready' when an inference session is loaded. */
  status: 'loading' | 'ready' | 'error' | 'unavailable';
  /** Human-readable error message when status !== 'ready'. */
  error?: string;
  /** Execution provider actually used (e.g. "nnapi", "cpu"). */
  executionProvider?: string;
  /** Path of the ONNX file this session was created from. */
  modelPath?: string;
  /** Input width/height of the model. */
  inputSize?: number;
}

export interface WasteClassifier {
  /** Loads the ONNX session (must be awaited before use). */
  load(): Promise<void>;
  /** Runs classification on one RGBA image. Returns top-1 class. */
  classify(image: RgbaImage): Promise<ClassificationResult>;
  dispose(): Promise<void>;
  readonly runtime: ModelRuntimeInfo;
}

export interface WasteDetector {
  load(): Promise<void>;
  /** Runs detection on one RGBA image. Returns zero or more boxes. */
  detect(image: RgbaImage): Promise<DetectionBox[]>;
  dispose(): Promise<void>;
  readonly runtime: ModelRuntimeInfo;
}

/** Tracks model availability so the UI can degrade gracefully. */
export type ModelAvailability =
  | { state: 'not-loaded' }
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'error'; message: string }
  | { state: 'unavailable'; message: string }
  | { state: 'missing' };