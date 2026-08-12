/**
 * Safe access to the ONNX Runtime react-native binding.
 *
 * In Expo Go the native module is not linked, so requiring it would throw.
 * We cache the result and let callers degrade gracefully.
 */

export type OnnxRuntimeBinding = NonNullable<
  typeof import('onnxruntime-react-native')
>;

let cached: OnnxRuntimeBinding | null = null;
let loaded = false;

export function getOnnxRuntime(): OnnxRuntimeBinding | null {
  if (loaded) return cached;
  loaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('onnxruntime-react-native');
  } catch {
    cached = null;
  }
  return cached;
}