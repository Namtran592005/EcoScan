import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Persistent store of user-imported ONNX models.
 *
 * Models are copied into `documentDirectory/models/` and described by a small
 * JSON index. Exactly one model can be active as the classifier and one as the
 * detector; the scan screen resolves the active models through modelManager.
 *
 * Nothing here depends on ONNX Runtime, so the store works even in Expo Go
 * (you can import/remove files; running inference still needs a dev build).
 */

export type ModelKind = 'classifier' | 'detector';

export interface StoredModel {
  id: string;
  /** File name (with .onnx extension) inside the models directory. */
  fileName: string;
  /** Auto-detected role at import time; re-checked when the model loads. */
  kind: ModelKind | 'unknown';
  /** Model input size in pixels (square) when known. */
  inputSize: number | null;
  /** Number of output classes when known. */
  numClasses: number | null;
  importedAt: number;
}

interface ModelIndex {
  version: 1;
  classifierId: string | null;
  detectorId: string | null;
  models: StoredModel[];
}

const MODELS_DIR = new Directory(Paths.document, 'models');
const INDEX_FILE = new File(MODELS_DIR, 'index.json');

let cache: ModelIndex | null = null;
let cacheLoaded = false;
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version++;
  listeners.forEach((l) => l());
}

export function subscribeModels(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current store version — changes every time the index is written. */
export function getModelStoreVersion(): number {
  void readIndex();
  return version;
}

function ensureDir(): void {
  if (!MODELS_DIR.exists) MODELS_DIR.create({ idempotent: true, intermediates: true });
}

function defaultIndex(): ModelIndex {
  return { version: 1, classifierId: null, detectorId: null, models: [] };
}

async function readIndex(): Promise<ModelIndex> {
  if (cacheLoaded) return cache ?? defaultIndex();
  ensureDir();
  let index = defaultIndex();
  if (INDEX_FILE.exists) {
    try {
      const parsed = JSON.parse(await INDEX_FILE.text()) as ModelIndex;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.models)) {
        index = parsed;
      }
    } catch {
      index = defaultIndex();
    }
  }
  cache = index;
  cacheLoaded = true;
  return index;
}

async function writeIndex(index: ModelIndex): Promise<void> {
  ensureDir();
  if (!INDEX_FILE.exists) INDEX_FILE.create();
  INDEX_FILE.write(JSON.stringify(index, null, 2));
  cache = index;
  cacheLoaded = true;
  emit();
}

/** Absolute filesystem path (without `file://`) for ONNX Runtime. */
export function modelPathFor(entry: StoredModel): string {
  const dir = MODELS_DIR.uri.replace(/^file:\/\//, '').replace(/\/+$/, '');
  return `${dir}/${entry.fileName}`;
}

export async function listModels(): Promise<StoredModel[]> {
  const index = await readIndex();
  return [...index.models].sort((a, b) => b.importedAt - a.importedAt);
}

export async function getActiveModel(
  role: ModelKind,
): Promise<StoredModel | null> {
  const index = await readIndex();
  const id = role === 'classifier' ? index.classifierId : index.detectorId;
  return index.models.find((m) => m.id === id) ?? null;
}

/**
 * Import an ONNX model by copying the picked file into the models directory.
 * `kind`/`inputSize`/`numClasses` are best-effort metadata captured at import;
 * the adapter re-detects everything when the session actually loads.
 */
export async function importModelFile(
  sourceUri: string,
  sourceName: string,
  meta: { kind: ModelKind | 'unknown'; inputSize: number | null; numClasses: number | null },
): Promise<StoredModel> {
  const index = await readIndex();
  const fileName = uniqueFileName(sanitizeFileName(sourceName), index.models);
  const dest = new File(MODELS_DIR, fileName);
  await new File(sourceUri).copy(dest, { overwrite: false });

  const entry: StoredModel = {
    id: `${fileName}-${Date.now()}`,
    fileName,
    kind: meta.kind,
    inputSize: meta.inputSize,
    numClasses: meta.numClasses,
    importedAt: Date.now(),
  };
  index.models.push(entry);
  // Auto-assign the imported model to its detected role when that role is
  // still empty, so the first import "just works".
  if (entry.kind === 'classifier' && !index.classifierId) {
    index.classifierId = entry.id;
  } else if (entry.kind === 'detector' && !index.detectorId) {
    index.detectorId = entry.id;
  }
  await writeIndex(index);
  return entry;
}

export async function deleteModel(id: string): Promise<void> {
  const index = await readIndex();
  const entry = index.models.find((m) => m.id === id);
  if (!entry) return;
  const file = new File(MODELS_DIR, entry.fileName);
  if (file.exists) file.delete();
  index.models = index.models.filter((m) => m.id !== id);
  if (index.classifierId === id) index.classifierId = null;
  if (index.detectorId === id) index.detectorId = null;
  await writeIndex(index);
}

export async function assignRole(id: string, role: ModelKind): Promise<void> {
  const index = await readIndex();
  if (!index.models.some((m) => m.id === id)) return;
  if (role === 'classifier') {
    index.classifierId = id;
  } else {
    index.detectorId = id;
  }
  await writeIndex(index);
}

export async function unassignRole(role: ModelKind): Promise<void> {
  const index = await readIndex();
  if (role === 'classifier') index.classifierId = null;
  else index.detectorId = null;
  await writeIndex(index);
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'model.onnx';
  return base.toLowerCase().endsWith('.onnx') ? base : `${base}.onnx`;
}

function uniqueFileName(name: string, existing: StoredModel[]): string {
  const taken = new Set(existing.map((m) => m.fileName));
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 2; ; i++) {
    const candidate = `${stem} (${i})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** React hook that re-renders whenever the model store changes. */
export function useModelStoreVersion(): number {
  return useSyncExternalStore(
    (cb) => subscribeModels(cb),
    () => getModelStoreVersion(),
    () => -1,
  );
}
