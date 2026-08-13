import { getOnnxRuntime } from '@/ai/onnxRuntime';
import type { ModelKind } from '@/services/modelStore';

/**
 * Lightweight ONNX model probing: opens a session, reads its graph metadata,
 * and figures out what the model is without running any inference.
 *
 * Supported shapes (batch=1):
 *  - classifier  [1, N]                     → N classes, input [1,3,H,W]
 *  - detector    [1, 4+N, A]  (channels-first) or [1, A, 4+N] (channels-last)
 *                → N classes, A anchors
 */

export interface ModelProbeResult {
  kind: ModelKind;
  inputSize: number;
  numClasses: number;
}

export async function probeModelFile(pathOrUri: string): Promise<ModelProbeResult> {
  const ort = getOnnxRuntime();
  if (!ort) {
    throw new Error('ONNX Runtime chưa khả dụng (cần Development Build).');
  }
  const path = pathOrUri.replace(/^file:\/\//, '');

  let session: Awaited<
    ReturnType<typeof ort.InferenceSession.create>
  > | null = null;
  try {
    session = await ort.InferenceSession.create(path, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    });

    const inputMeta = session.inputMetadata[0];
    const outputMeta = session.outputMetadata[0];
    if (!inputMeta || !outputMeta || !inputMeta.isTensor || !outputMeta.isTensor) {
      throw new Error('Không đọc được cấu trúc input/output của model.');
    }

    const inputSize = inferInputSize(inputMeta.shape);
    if (inputSize <= 0) {
      throw new Error(
        `Không nhận dạng được kích thước input [${inputMeta.shape.join(',')}].`,
      );
    }

    const outShape = outputMeta.shape;
    const result = classifyOutputShape(outShape);
    if (!result) {
      throw new Error(
        `Không hỗ trợ output dạng [${outShape.join(',')}]. ` +
          'Hỗ trợ phân loại [1,N] và phát hiện [1,4+N,A] / [1,A,4+N].',
      );
    }

    return { kind: result.kind, inputSize, numClasses: result.numClasses };
  } finally {
    session?.release();
  }
}

/** Input must be a square image: [1, 3, H, W]. */
function inferInputSize(shape: readonly (number | string)[]): number {
  const dims = numericShape(shape);
  if (dims.length !== 4 || dims[0] !== 1) return 0;
  const h = dims[2];
  const w = dims[3];
  if (h !== w || h <= 0) return 0;
  return h;
}

function classifyOutputShape(
  shape: readonly (number | string)[],
): { kind: ModelKind; numClasses: number } | null {
  const dims = numericShape(shape);
  if (dims.length === 2 && dims[0] === 1 && dims[1] >= 1) {
    return { kind: 'classifier', numClasses: dims[1] };
  }
  if (dims.length === 3 && dims[0] === 1) {
    const a = dims[1];
    const b = dims[2];
    // channels-first: [1, 4+N, A] where A (anchors) is the large dimension.
    // channels-last:  [1, A, 4+N] where A is the large dimension.
    const anchors = Math.max(a, b);
    const width = Math.min(a, b);
    const numClasses = width - 4;
    if (anchors > 0 && numClasses >= 1) {
      return { kind: 'detector', numClasses };
    }
  }
  return null;
}

/** Keep only the concrete integer dimensions of a (possibly symbolic) shape. */
function numericShape(shape: readonly (number | string)[]): number[] {
  return shape.filter((d): d is number => typeof d === 'number');
}
