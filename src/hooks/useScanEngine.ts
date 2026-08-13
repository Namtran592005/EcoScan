import { useEffect, useMemo, useRef, useState } from 'react';
import type { CameraView } from 'expo-camera';
import type { WasteClassifier, WasteDetector, ClassificationResult, DetectionBox } from '@/ai/types';
import { ClassifySmoother, DetectorBoxStabilizer } from '@/ai/smoothing';
import { CLASSIFY_UNCERTAIN_AFTER_FRAMES, DETECT_INPUT_SIZE, HUD_CROP_FRACTION, INFER_MIN_INTERVAL_MS } from '@/data/thresholds';
import { categoryForClass } from '@/data/wasteRules';
import { captureSquareBase64, decodeJpegBase64ToRgba } from '@/services/imageToTensor';
import { perf } from '@/utils/perf';

export type ScanMode = 'single' | 'multi';
export type ScanStatus = 'idle' | 'analyzing' | 'confirmed';

export interface CategoryCounts {
  recyclable: number;
  food: number;
  other: number;
  hazardous: number;
}

const EMPTY_COUNTS: CategoryCounts = {
  recyclable: 0,
  food: 0,
  other: 0,
  hazardous: 0,
};

const MAX_CONSECUTIVE_ERRORS = 5;

interface EngineInputs {
  cameraRef: { current: CameraView | null };
  mode: ScanMode;
  /** true when the loop should run (focused, permission granted, model ready). */
  active: boolean;
  classifier: WasteClassifier | null;
  detector: WasteDetector | null;
}

export function useScanEngine({
  cameraRef,
  mode,
  active,
  classifier,
  detector,
}: EngineInputs) {
  const smootherRef = useRef<ClassifySmoother | null>(null);
  const stabilizerRef = useRef<DetectorBoxStabilizer | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [counts, setCounts] = useState<CategoryCounts>(EMPTY_COUNTS);
  const [objectCount, setObjectCount] = useState(0);
  const [uncertainHint, setUncertainHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    if (!active) return;

    // Refs are mutated here (not during render) so the linter is happy.
    const smoother = (smootherRef.current ??= new ClassifySmoother());
    const stabilizer = (stabilizerRef.current ??= new DetectorBoxStabilizer());
    smoother.reset();
    stabilizer.reset();

    let cancelled = false;
    let errors = 0;

    async function loop() {
      let lastCycle = 0;
      while (!cancelled) {
        const now = Date.now();
        const wait = lastCycle + INFER_MIN_INTERVAL_MS - now;
        if (wait > 0) await sleep(wait);
        lastCycle = Date.now();

        const cam = cameraRef.current;
        if (!cam) {
          await sleep(200);
          continue;
        }

        const t0 = Date.now();
        try {
          // Crop to the HUD square in single mode; full camera square in multi
          // mode — must match the on-screen rect passed to the overlays.
          const base64 = await captureSquareBase64(
            cam,
            DETECT_INPUT_SIZE,
            mode === 'single' ? HUD_CROP_FRACTION : 1,
          );
          const rgba = decodeJpegBase64ToRgba(base64);

          if (mode === 'single') {
            if (!classifier) continue;

            const result = await classifier.classify(rgba);

            // Realtime box: reuse the detector on the same frame so the object
            // gets a thin tracking frame while scanning and a tight box on
            // confirm (instead of the static green square).
            let boxes: DetectionBox[] = [];
            if (detector) {
              const raw = await detector.detect(rgba);
              boxes = stabilizer.track(raw);
            }

            smoother.push(result.className, result.confidence);
            perf.recordCycle(Date.now() - t0);
            errors = 0;

            setDetections((prev) => (sameBoxes(prev, boxes) ? prev : boxes));
            const stats = computeCounts(boxes);
            setCounts(stats.counts);
            setObjectCount(stats.objectCount);

            const confirmed = smoother.confirmedResult;
            if (confirmed) {
              setClassification(confirmed);
              setStatus('confirmed');
              cancelled = true; // freeze inference to save CPU/battery
              break;
            }
            const frames = smoother.analysedFrames;
            setStatus(frames > 0 ? 'analyzing' : 'idle');
            if (frames > 0 && frames % CLASSIFY_UNCERTAIN_AFTER_FRAMES === 0) {
              setUncertainHint(true);
              if (hintTimer.current) clearTimeout(hintTimer.current);
              hintTimer.current = setTimeout(() => setUncertainHint(false), 1800);
            }
          } else {
            if (!detector) continue;
            const rawBoxes = await detector.detect(rgba);
            const stable = stabilizer.track(rawBoxes);
            perf.recordCycle(Date.now() - t0);
            errors = 0;
            setDetections((prev) => (sameBoxes(prev, stable) ? prev : stable));
            const stats = computeCounts(stable);
            setCounts(stats.counts);
            setObjectCount(stats.objectCount);
          }
        } catch (err) {
          errors++;
          const message = err instanceof Error ? err.message : 'Lỗi không xác định';
          if (errors >= MAX_CONSECUTIVE_ERRORS) {
            setError(
              `Không thể tiếp tục phân tích (${message}). Hãy thử quét lại.`,
            );
            cancelled = true;
            break;
          }
          // Transient failure (e.g. camera busy) — retry after a breath.
          await sleep(250);
        }
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
  }, [active, mode, classifier, detector, scanKey, cameraRef]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const reset = () => {
    setStatus('idle');
    setClassification(null);
    setDetections([]);
    setObjectCount(0);
    setCounts(EMPTY_COUNTS);
    setUncertainHint(false);
    setError(null);
    setScanKey((key) => key + 1);
  };

  return useMemo(
    () => ({
      status,
      classification,
      detections,
      counts,
      objectCount,
      uncertainHint,
      error,
      reset,
    }),
    [status, classification, detections, counts, objectCount, uncertainHint, error],
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeCounts(
  boxes: DetectionBox[],
): { counts: CategoryCounts; objectCount: number } {
  const counts: CategoryCounts = { ...EMPTY_COUNTS };
  for (const box of boxes) {
    const cat = categoryForClass(box.className);
    if (cat) counts[cat]++;
  }
  return { counts, objectCount: boxes.length };
}

function sameBoxes(a: DetectionBox[], b: DetectionBox[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].className !== b[i].className ||
      Math.abs(a[i].x - b[i].x) > 0.02 ||
      Math.abs(a[i].y - b[i].y) > 0.02
    ) {
      return false;
    }
  }
  return true;
}