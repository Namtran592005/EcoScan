import { CLASSIFY_INPUT_SIZE, DETECT_INPUT_SIZE } from '@/data/thresholds';
import type { RgbaImage } from './types';

/** Pool of reusable Float32Array input buffers keyed by dimension. */
const bufferPool = new Map<number, Float32Array>();

function getPooledBuffer(length: number): Float32Array {
  let buf = bufferPool.get(length);
  if (!buf) {
    buf = new Float32Array(length);
    bufferPool.set(length, buf);
  }
  return buf;
}

/**
 * Resize an RGBA image to `size × size` using bilinear interpolation and write
 * it straight into a float32, channel-first, normalized [0,1] tensor (RGB;
 * alpha dropped).
 *
 * Reuses pooled buffers to keep GC pressure low on low-end Android.
 */
export function rgbaToNormalizedNchw(
  image: RgbaImage,
  size: number,
): Float32Array {
  const src = image.data;
  const srcW = image.width;
  const srcH = image.height;
  const out = getPooledBuffer(3 * size * size);

  if (srcW === size && srcH === size) {
    // Fast path: no scaling needed.
    for (let y = 0; y < size; y++) {
      const row = y * size;
      const srcRow = y * srcW * 4;
      for (let x = 0; x < size; x++) {
        const si = srcRow + x * 4;
        out[row + x] = src[si] / 255;
        out[size * size + row + x] = src[si + 1] / 255;
        out[2 * size * size + row + x] = src[si + 2] / 255;
      }
    }
    return out;
  }

  const scaleX = srcW / size;
  const scaleY = srcH / size;
  const plane = size * size;
  for (let y = 0; y < size; y++) {
    const srcY = y * scaleY;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fy = srcY - y0;
    for (let x = 0; x < size; x++) {
      const srcX = x * scaleX;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const fx = srcX - x0;
      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;
      const idx = y * size + x;
      const w00 = (1 - fy) * (1 - fx);
      const w01 = (1 - fy) * fx;
      const w10 = fy * (1 - fx);
      const w11 = fy * fx;
      out[idx] =
        (src[i00] * w00 + src[i10] * w01 + src[i01] * w10 + src[i11] * w11) /
        255;
      out[plane + idx] =
        (src[i00 + 1] * w00 +
          src[i10 + 1] * w01 +
          src[i01 + 1] * w10 +
          src[i11 + 1] * w11) /
        255;
      out[2 * plane + idx] =
        (src[i00 + 2] * w00 +
          src[i10 + 2] * w01 +
          src[i01 + 2] * w10 +
          src[i11 + 2] * w11) /
        255;
    }
  }
  return out;
}

export const CLASSIFY_MODEL_INPUT = CLASSIFY_INPUT_SIZE;
export const DETECT_MODEL_INPUT = DETECT_INPUT_SIZE;