import { Asset } from 'expo-asset';

/**
 * Model asset paths.
 *
 * The `.onnx` files live in `assets/models/` and are treated as Metro assets
 * (see metro.config.js). At runtime `expo-asset` resolves them to absolute
 * filesystem paths that ONNX Runtime can open.
 */
export const MODEL_ASSETS = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  classifier: require('../../assets/models/wastewise-yolo.onnx'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  detector: require('../../assets/models/yolo11_trash_detection.onnx'),
} as const;

export const MODEL_DISPLAY_NAMES = {
  classifier: 'wastewise-yolo.onnx',
  detector: 'yolo11_trash_detection.onnx',
} as const;

function toAbsolutePath(uri: string): string {
  // localUri may be "file:///data/..." on Android — ORT wants the raw path.
  return uri.replace(/^file:\/\//, '');
}

/** Resolve an asset module id to an absolute file path ready for ORT. */
export async function resolveModelPath(assetModule: number): Promise<string> {
  let asset: Asset;
  try {
    asset = Asset.fromModule(assetModule as never);
  } catch {
    throw new Error('Không tìm thấy file model trong bundle.');
  }
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('Không thể giải quyết đường dẫn model từ asset bundle.');
  }
  return toAbsolutePath(uri);
}