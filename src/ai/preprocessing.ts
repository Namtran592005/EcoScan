import type { RgbaImage } from './types';

/** Tensor memory layout expected by the ONNX model input. */
export type TensorLayout = 'nchw' | 'nhwc';

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
 * it straight into a float32, normalized [0,1] tensor (RGB; alpha dropped).
 *
 * `layout` selects the tensor memory order:
 *  - `nchw`  channel-first  [1, 3, size, size] (most ONNX conv models)
 *  - `nhwc`  channels-last  [1, size, size, 3] (tf2onnx MobileNet-style)
 *
 * Reuses pooled buffers to keep GC pressure low on low-end Android.
 */
export function rgbaToNormalized(
  image: RgbaImage,
  size: number,
  layout: TensorLayout = 'nchw',
): Float32Array {
  const src = image.data;
  const srcW = image.width;
  const srcH = image.height;
  const out = getPooledBuffer(3 * size * size);

  const hwc = layout === 'nhwc';
  if (srcW === size && srcH === size) {
    // Fast path: no scaling needed.
    for (let y = 0; y < size; y++) {
      const row = y * size;
      const srcRow = y * srcW * 4;
      for (let x = 0; x < size; x++) {
        const si = srcRow + x * 4;
        const idx = row + x;
        if (hwc) {
          out[3 * idx] = src[si] / 255;
          out[3 * idx + 1] = src[si + 1] / 255;
          out[3 * idx + 2] = src[si + 2] / 255;
        } else {
          out[idx] = src[si] / 255;
          out[size * size + idx] = src[si + 1] / 255;
          out[2 * size * size + idx] = src[si + 2] / 255;
        }
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
      const r =
        (src[i00] * w00 + src[i10] * w01 + src[i01] * w10 + src[i11] * w11) /
        255;
      const g =
        (src[i00 + 1] * w00 +
          src[i10 + 1] * w01 +
          src[i01 + 1] * w10 +
          src[i11 + 1] * w11) /
        255;
      const b =
        (src[i00 + 2] * w00 +
          src[i10 + 2] * w01 +
          src[i01 + 2] * w10 +
          src[i11 + 2] * w11) /
        255;
      if (hwc) {
        out[3 * idx] = r;
        out[3 * idx + 1] = g;
        out[3 * idx + 2] = b;
      } else {
        out[idx] = r;
        out[plane + idx] = g;
        out[2 * plane + idx] = b;
      }
    }
  }
  return out;
}
