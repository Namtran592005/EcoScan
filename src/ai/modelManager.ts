import { OnnxImportModel } from './genericAdapter';
import { bundledClassifierPath } from './bundledClassifier';
import type { ModelAvailability, WasteClassifier, WasteDetector } from './types';
import { getActiveModel, modelPathFor } from '@/services/modelStore';

/**
 * Singleton model manager.
 *
 * Resolves the active classifier/detector from the model store (user-imported
 * ONNX files) and caches the loaded adapters. When the store changes (import /
 * remove / reassign), the cached promises are invalidated so the next access
 * picks up the new configuration.
 */

let classifierPromise: Promise<WasteClassifier> | null = null;
let detectorPromise: Promise<WasteDetector> | null = null;

function invalidate(): void {
  classifierPromise = null;
  detectorPromise = null;
}

export function invalidateModels(): void {
  invalidate();
}

function createClassifier(): Promise<WasteClassifier> {
  classifierPromise = (async () => {
    const entry = await getActiveModel('classifier');
    const modelPath = entry
      ? modelPathFor(entry)
      : await bundledClassifierPath();
    const adapter = new OnnxImportModel(modelPath, 'classifier');
    await adapter.load();
    return adapter;
  })();
  return classifierPromise;
}

function createDetector(): Promise<WasteDetector> {
  detectorPromise = (async () => {
    const entry = await getActiveModel('detector');
    if (!entry) {
      throw new Error('CHUA_CO_MODEL');
    }
    const adapter = new OnnxImportModel(modelPathFor(entry), 'detector');
    await adapter.load();
    return adapter;
  })();
  return detectorPromise;
}

/** Get (and lazily load) the classifier adapter. Rejects when none is set. */
export function getClassifier(): Promise<WasteClassifier> {
  return classifierPromise ?? createClassifier();
}

/** Get (and lazily load) the detector adapter. Rejects when none is set. */
export function getDetector(): Promise<WasteDetector> {
  return detectorPromise ?? createDetector();
}

/**
 * Best-effort: resolve a classifier availability state without throwing.
 * The bundled classifier is always available as a fallback, so this can only
 * be `missing` when the bundled asset itself cannot be resolved.
 */
export async function classifierAvailability(): Promise<ModelAvailability> {
  return resolveAvailability(getClassifier);
}

/** Best-effort: resolve a detector availability state without throwing. */
export async function detectorAvailability(): Promise<ModelAvailability> {
  const entry = await getActiveModel('detector');
  if (!entry) return { state: 'missing' };
  return resolveAvailability(getDetector);
}

async function resolveAvailability(
  get: () => Promise<WasteClassifier | WasteDetector>,
): Promise<ModelAvailability> {
  try {
    const model = await get();
    if (model.runtime.status === 'ready') return { state: 'ready' };
    if (model.runtime.status === 'unavailable') {
      return {
        state: 'unavailable',
        message: model.runtime.error ?? 'Native inference unavailable',
      };
    }
    return { state: 'error', message: model.runtime.error ?? 'Unknown' };
  } catch (error) {
    if (error instanceof Error && error.message === 'CHUA_CO_MODEL') {
      return { state: 'missing' };
    }
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
  invalidate();
}

/** Force the classifier to be reloaded on next access (retry path). */
export function resetClassifier(): void {
  classifierPromise = null;
}

/** Force the detector to be reloaded on next access (retry path). */
export function resetDetector(): void {
  detectorPromise = null;
}
