import type { WasteClassId } from './wasteRules';

export type { WasteClassId };

/**
 * Labels for the detection model (`yolo11_trash_detection.onnx`).
 *
 * The exported ONNX graph only stores generic names (`class_0` … `class_7`),
 * so we keep the real-world labels here and let you remap them without
 * retraining. Verify the order against the dataset used to train the detector;
 * the default below assumes the same 8-class taxonomy as the classifier.
 */
export const DETECTION_LABELS: WasteClassId[] = [
  'battery',
  'biological',
  'cardboard',
  'glass',
  'metal',
  'paper',
  'plastic',
  'trash',
];

/** Index lookup for O(1) mapping of the detector's class index → label. */
export const DETECTION_LABEL_BY_INDEX: Record<number, WasteClassId> =
  Object.fromEntries(DETECTION_LABELS.map((label, index) => [index, label]));

/**
 * Labels for the classifier model (`wastewise-yolo.onnx`).
 * The exported ONNX graph of this model embeds a `names` metadata map with the
 * same 8-class taxonomy (battery, biological, ... trash) in this order.
 */
export const CLASSIFY_LABELS: WasteClassId[] = [
  'battery',
  'biological',
  'cardboard',
  'glass',
  'metal',
  'paper',
  'plastic',
  'trash',
];

/**
 * Maps a raw detector class index to a human label.
 * Falls back to "trash" for unknown indices so the UI never crashes.
 */
export function detectionLabelForIndex(index: number): WasteClassId {
  return DETECTION_LABEL_BY_INDEX[index] ?? 'trash';
}