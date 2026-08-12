import {
  CLASSIFY_CONFIDENCE_THRESHOLD,
  CLASSIFY_CONFIRM_STREAK,
  CLASSIFY_SMOOTHING_WINDOW,
} from '@/data/thresholds';
import type { ClassificationResult, DetectionBox } from './types';

/**
 * Temporal smoothing for single-object classification.
 *
 * A class is only confirmed when it wins as top-1 prediction for
 * `confirmStreak` consecutive analysed frames, each with confidence at or above
 * the confirm threshold. This prevents flickery single-frame outcomes.
 */
export class ClassifySmoother {
  private readonly windowSize: number;
  private readonly confirmStreak: number;
  private readonly confidenceThreshold: number;

  private frames: { className: string; confidence: number }[] = [];
  private streakLabel = '';
  private streak = 0;
  private confirmed: ClassificationResult | null = null;
  private analysed = 0;

  constructor(
    options: {
      windowSize?: number;
      confirmStreak?: number;
      confidenceThreshold?: number;
    } = {},
  ) {
    this.windowSize = options.windowSize ?? CLASSIFY_SMOOTHING_WINDOW;
    this.confirmStreak = options.confirmStreak ?? CLASSIFY_CONFIRM_STREAK;
    this.confidenceThreshold =
      options.confidenceThreshold ?? CLASSIFY_CONFIDENCE_THRESHOLD;
  }

  push(className: string, confidence: number): void {
    this.analysed++;
    this.frames.push({ className, confidence });
    if (this.frames.length > this.windowSize) {
      this.frames.shift();
    }

    const last = this.frames[this.frames.length - 1];
    if (last.confidence >= this.confidenceThreshold) {
      if (last.className === this.streakLabel) {
        this.streak++;
      } else {
        this.streakLabel = last.className;
        this.streak = 1;
      }
    } else {
      this.streakLabel = '';
      this.streak = 0;
    }

    // Need at least 2 votes before it can be considered stable.
    if (this.streak >= this.confirmStreak && this.streak >= 2) {
      let sum = 0;
      let count = 0;
      for (const f of this.frames) {
        if (f.className === this.streakLabel) {
          sum += f.confidence;
          count++;
        }
      }
      this.confirmed = {
        className: this.streakLabel,
        confidence: count > 0 ? sum / count : last.confidence,
      };
    }
  }

  get confirmedResult(): ClassificationResult | null {
    return this.confirmed;
  }

  get analysedFrames(): number {
    return this.analysed;
  }

  reset(): void {
    this.frames = [];
    this.streakLabel = '';
    this.streak = 0;
    this.confirmed = null;
    this.analysed = 0;
  }
}

/**
 * Light temporal stabilizer for detector boxes (multi-object mode).
 *
 * A box is only drawn when it was also present in the previous analysed frame
 * (matched by IoU). Keeps single-frame false positives from flickering on the
 * overlay.
 */
export class DetectorBoxStabilizer {
  private previous: DetectionBox[] = [];

  track(detections: DetectionBox[], minOverlap = 0.3): DetectionBox[] {
    const stable: DetectionBox[] = [];
    for (const box of detections) {
      let found = false;
      for (const prev of this.previous) {
        if (prev.className === box.className && iou(prev, box) >= minOverlap) {
          found = true;
          break;
        }
      }
      if (found) stable.push(box);
    }
    this.previous = detections;
    return stable;
  }

  reset(): void {
    this.previous = [];
  }
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
  return inter / (a.width * a.height + b.width * b.height - inter);
}