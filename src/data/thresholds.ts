/**
 * Tunable inference / smoothing parameters.
 *
 * Everything here can be adjusted at runtime via the debug screen without
 * touching the models.
 */

/** Single-object (classification) model input size. */
export const CLASSIFY_INPUT_SIZE = 224;

/**
 * Fraction of the camera frame analyzed in single-object mode (the on-screen
 * HUD square). Multi-object mode analyzes the full camera square.
 */
export const HUD_CROP_FRACTION = 0.62;

/** Multi-object (detection) model input size. */
export const DETECT_INPUT_SIZE = 640;

/** Minimum confidence (0..1) for a classification frame to count as a vote. */
export const CLASSIFY_CONFIDENCE_THRESHOLD = 0.55;

/**
 * Temporal smoothing window (number of analysed frames). A class is only
 * confirmed after being the top prediction in CONFIRM_STREAK consecutive
 * analysed frames.
 */
export const CLASSIFY_SMOOTHING_WINDOW = 4;
export const CLASSIFY_CONFIRM_STREAK = 3;

/** After this many analysed frames without a stable result, show "Không chắc chắn". */
export const CLASSIFY_UNCERTAIN_AFTER_FRAMES = 8;

/** Minimum confidence (0..1) for a detected box to be drawn. */
export const DETECT_CONFIDENCE_THRESHOLD = 0.35;

/** IoU threshold used for non-max suppression. */
export const DETECT_NMS_IOU = 0.45;

/** Maximum number of boxes kept per frame. */
export const DETECT_MAX_BOXES = 20;

/** Lower bound box size (fraction of the input) to filter tiny noise boxes. */
export const DETECT_MIN_BOX_SIZE = 0.02;

/**
 * Target inference rate (frames per second). The capture pipeline is async, so
 * this acts as a throttle — never run more than one inference at a time.
 */
export const TARGET_INFER_FPS = 5;

/** Throttle between capture starts, in milliseconds. */
export const INFER_MIN_INTERVAL_MS = Math.round(1000 / TARGET_INFER_FPS);

/**
 * JPEG quality for intermediate camera snapshots. Lower = faster encode/decode
 * on low-end Android.
 */
export const CAPTURE_QUALITY = 0.4;

/** ONNX Runtime execution providers tried in order (Android). */
export const ONNX_EXECUTION_PROVIDERS = ['nnapi', 'cpu'] as const;