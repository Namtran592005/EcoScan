import type { CameraView } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { CAPTURE_QUALITY, HUD_CROP_FRACTION } from '@/data/thresholds';
import type { RgbaImage } from '@/ai/types';

/**
 * Captures one camera frame and center-crops it to the HUD square region
 * (`cropFraction` of the photo's min dimension — same fraction the on-screen
 * square uses), then resizes it to the model input size.
 *
 * Returning a base64 JPEG. Native crop+resize keeps the JS thread light and
 * guarantees square input without letterboxing distortion.
 */
export async function captureSquareBase64(
  cameraRef: CameraView,
  targetSize: number,
  cropFraction = HUD_CROP_FRACTION,
): Promise<string> {
  const photo = await cameraRef.takePictureAsync({
    quality: CAPTURE_QUALITY,
    base64: false,
    shutterSound: false,
  });
  if (!photo) throw new Error('Camera không trả về ảnh.');

  const side = Math.round(Math.min(photo.width, photo.height) * cropFraction);
  const originX = Math.round((photo.width - side) / 2);
  const originY = Math.round((photo.height - side) / 2);

  const result = await manipulateAsync(
    photo.uri,
    [
      { crop: { originX, originY, width: side, height: side } },
      { resize: { width: targetSize, height: targetSize } },
    ],
    { compress: 0.85, format: SaveFormat.JPEG, base64: true },
  );

  if (!result.base64) {
    throw new Error('Không tạo được ảnh nhận diện từ frame camera.');
  }
  return result.base64;
}

/** Decode a base64 JPEG into an RGBA byte image for the AI adapters. */
export function decodeJpegBase64ToRgba(base64: string): RgbaImage {
  const decoded = jpeg.decode(base64ToUint8Array(base64), {
    useTArray: true,
    maxMemoryUsageInMB: 128,
    formatAsRGBA: true,
  });
  return {
    data: decoded.data,
    width: decoded.width,
    height: decoded.height,
  };
}

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Dependency-free base64 → bytes (Hermes parity). Avoids a Node Buffer
 * dependency inside the RN bundle.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  let padding = 0;
  const len = base64.length;
  while (len > 0 && base64[len - 1 - padding] === '=') padding++;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4) - padding);
  let buffer = 0;
  let bits = 0;
  let out = 0;
  for (let i = 0; i < len; i++) {
    const c = base64.charCodeAt(i);
    let value: number;
    if (c === 61) break; // '='
    const idx = BASE64_CHARS.indexOf(base64[i]);
    if (idx === -1) continue;
    value = idx;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes;
}