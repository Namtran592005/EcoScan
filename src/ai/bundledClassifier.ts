import { Asset } from 'expo-asset';

/**
 * The app ships with a bundled 10-class waste classifier
 * (`assets/models/phanloai.onnx`, MobileNetV2 224×224, HWC input). It is
 * exposed as an asset so ONNX Runtime can open it from a real filesystem path
 * (assets bundled into the app are not directly readable by native code).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BUNDLED_MODULE = require('@/assets/models/phanloai.onnx') as number;

export const BUNDLED_CLASSIFIER_NAME = 'phanloai.onnx (mặc định)';

let cachedPath: string | null = null;

/** Absolute filesystem path (without `file://`) of the bundled classifier. */
export async function bundledClassifierPath(): Promise<string> {
  if (cachedPath) return cachedPath;
  const asset = Asset.fromModule(BUNDLED_MODULE);
  if (!asset.localUri) await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  cachedPath = uri.replace(/^file:\/\//, '');
  return cachedPath;
}