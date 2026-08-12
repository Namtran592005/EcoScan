import type { DetectionBox } from './types';

/**
 * Output post-processing for Ultralytics YOLOv8/YOLO11-style detection graphs.
 *
 * Detector output shape: [1, 4 + numClasses, numAnchors] (no separate
 * objectness head — YOLOv8+ removed it). Rows are cx, cy, w, h followed by one
 * confidence row per class. Coordinates are relative to the input size.
 */
export function processDetectionOutput(
  data: Float32Array | number[],
  inputSize: number,
  numClasses: number,
  options: {
    confThreshold: number;
    iouThreshold: number;
    maxBoxes: number;
    minBoxSize: number;
  },
  labelForIndex: (index: number) => string,
): DetectionBox[] {
  const anchors = data.length / (4 + numClasses);
  if (!Number.isInteger(anchors)) return [];

  const stride = inputSize;

  const candidates: DetectionBox[] = [];
  for (let i = 0; i < anchors; i++) {
    let bestScore = -1;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c++) {
      const s = data[(4 + c) * anchors + i];
      if (s > bestScore) {
        bestScore = s;
        bestClass = c;
      }
    }
    if (bestScore < options.confThreshold) continue;

    const cx = data[i] / stride;
    const cy = data[anchors + i] / stride;
    const w = data[2 * anchors + i] / stride;
    const h = data[3 * anchors + i] / stride;
    if (w <= 0 || h <= 0) continue;
    if (w < options.minBoxSize || h < options.minBoxSize) continue;

    candidates.push({
      className: labelForIndex(bestClass),
      confidence: bestScore,
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
    });
  }

  return nonMaxSuppression(candidates, options.iouThreshold).slice(
    0,
    options.maxBoxes,
  );
}

function nonMaxSuppression(
  boxes: DetectionBox[],
  iouThreshold: number,
): DetectionBox[] {
  const order = boxes
    .map((b, i) => ({ index: i, score: b.confidence }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.index);

  const kept: DetectionBox[] = [];
  const suppressed = new Array(boxes.length).fill(false) as boolean[];

  for (const i of order) {
    if (suppressed[i]) continue;
    const box = boxes[i];
    kept.push(box);
    for (const j of order) {
      if (suppressed[j]) continue;
      if (iou(box, boxes[j]) > iouThreshold) suppressed[j] = true;
    }
    // Prevent O(n²) blowup on degenerate frames.
    if (kept.length >= 50) break;
  }
  return kept;
}

function iou(a: DetectionBox, b: DetectionBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const interW = x2 - x1;
  const interH = y2 - y1;
  if (interW <= 0 || interH <= 0) return 0;
  const inter = interW * interH;
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  return inter / (areaA + areaB - inter);
}

/** Softmax over a small logits array (returns top class + probability). */
export function softmaxTop1(
  logits: Float32Array,
): { index: number; probability: number } {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    sum += Math.exp(logits[i] - max);
  }
  let bestProb = -1;
  let bestIndex = 0;
  for (let i = 0; i < logits.length; i++) {
    const p = Math.exp(logits[i] - max) / sum;
    if (p > bestProb) {
      bestProb = p;
      bestIndex = i;
    }
  }
  return { index: bestIndex, probability: bestProb };
}