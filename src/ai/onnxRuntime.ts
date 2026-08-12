/**
 * Safe access to the ONNX Runtime react-native binding.
 *
 * In Expo Go the native module is not linked, so `NativeModules.Onnxruntime`
 * is undefined and merely evaluating the package would throw
 * ("Cannot read property 'install' of null"). We check for the native module
 * first and let callers degrade gracefully.
 */

import { NativeModules } from 'react-native';

export type OnnxRuntimeBinding = NonNullable<
  typeof import('onnxruntime-react-native')
>;

let cached: OnnxRuntimeBinding | null = null;
let loaded = false;

export function getOnnxRuntime(): OnnxRuntimeBinding | null {
  if (loaded) return cached;
  loaded = true;

  const nativeModule = (NativeModules as Record<string, unknown>).Onnxruntime;
  if (!nativeModule) {
    // Not a development build (or Expo Go) — native inference unavailable.
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('onnxruntime-react-native');
  } catch {
    cached = null;
  }
  return cached;
}