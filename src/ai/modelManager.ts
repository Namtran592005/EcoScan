import { OnnxWasteClassifier } from './classifierAdapter';
import { OnnxWasteDetector } from './detectorAdapter';
import type { ModelAvailability, WasteClassifier, WasteDetector } from './types';
import { resolveModelPath, MODEL_ASSETS } from '@/services/modelAssets';

/**
 * Singleton model manager.
 *
 * Loads classifier/detector ONNX sessions lazily and resolves their asset
 * paths once. The screen reads availability through getters; load failures are
 * surfaced as discreet states instead of crashing the app.
 */

let classifierPromise: Promise<WasteClassifier> | null = null;
let detectorPromise: Promise<WasteDetector> | null = null;

function createClassifier(): Promise<WasteClassifier> {
  classifierPromise = (async () => {
    const path = await resolveModelPath(MODEL_ASSETS.classifier as never);
    const adapter = new OnnxWasteClassifier(path);
    await adapter.load();
    return adapter;
  })();
  return classifierPromise;
}

function createDetector(): Promise<WasteDetector> {
  detectorPromise = (async () => {
    const path = await resolveModelPath(MODEL_ASSETS.detector as never);
    const adapter = new OnnxWasteDetector(path);
    await adapter.load();
    return adapter;
  })();
  return detectorPromise;
}

/** Get (and lazily load) the classifier adapter. Rejects on failure. */
export function getClassifier(): Promise<WasteClassifier> {
  return classifierPromise ?? createClassifier();
}

/** Get (and lazily load) the detector adapter. Rejects on failure. */
export function getDetector(): Promise<WasteDetector> {
  return detectorPromise ?? createDetector();
}

/** Pre-load both models in parallel (call once at app start). */
export function preloadModels(): Promise<void> {
  return Promise.allSettled([getClassifier(), getDetector()]).then(
    () => undefined,
  );
}

/** Best-effort: resolve a classifier availability state without throwing. */
export async function classifierAvailability(): Promise<ModelAvailability> {
  try {
    const classifier = await getClassifier();
    if (classifier.runtime.status === 'ready') return { state: 'ready' };
    if (classifier.runtime.status === 'unavailable') {
      return {
        state: 'unavailable',
        message: classifier.runtime.error ?? 'Native inference unavailable',
      };
    }
    return { state: 'error', message: classifier.runtime.error ?? 'Unknown' };
  } catch (error) {
    return {
      state: 'error',
      message: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

/** Best-effort: resolve a detector availability state without throwing. */
export async function detectorAvailability(): Promise<ModelAvailability> {
  try {
    const detector = await getDetector();
    if (detector.runtime.status === 'ready') return { state: 'ready' };
    if (detector.runtime.status === 'unavailable') {
      return {
        state: 'unavailable',
        message: detector.runtime.error ?? 'Native inference unavailable',
      };
    }
    return { state: 'error', message: detector.runtime.error ?? 'Unknown' };
  } catch (error) {
    return {
      state: 'error',
      message: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

/** Release sessions (use on app teardown if desired). */
export async function disposeModels(): Promise<void> {
  const jobs: Promise<void>[] = [];
  if (classifierPromise) {
    jobs.push(
      classifierPromise.then((c) => c.dispose()).catch(() => undefined),
    );
  }
  if (detectorPromise) {
    jobs.push(detectorPromise.then((d) => d.dispose()).catch(() => undefined));
  }
  await Promise.all(jobs);
  classifierPromise = null;
  detectorPromise = null;
}

/** Force the classifier to be reloaded on next access (retry path). */
export function resetClassifier(): void {
  classifierPromise = null;
}

/** Force the detector to be reloaded on next access (retry path). */
export function resetDetector(): void {
  detectorPromise = null;
}