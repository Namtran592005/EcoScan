import { getOnnxRuntime } from '@/ai/onnxRuntime';
import type { ModelKind } from '@/services/modelStore';

/**
 * Lightweight ONNX model probing: opens a session, reads its graph metadata,
 * and figures out what the model is without running any inference.
 *
 * Input layouts supported (batch may be symbolic):
 *  - channels-first [N, 3, H, W]
 *  - channels-last  [N, H, W, 3]
 *
 * Output shapes (batch=1):
 *  - classifier  [1, N]                     → N classes
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

/** Input must be a square image: [N,3,H,W] or [N,H,W,3]. */
function inferInputSize(shape: readonly (number | string)[]): number {
  if (shape.length !== 4) return 0;
  const channelsLast = shape[3] === 3;
  if (channelsLast) {
    const h = numAt(shape, 1);
    const w = numAt(shape, 2);
    return h === w && h > 0 ? h : 0;
  }
  const h = numAt(shape, 2);
  const w = numAt(shape, 3);
  return h === w && h > 0 ? h : 0;
}

function classifyOutputShape(
  shape: readonly (number | string)[],
): { kind: ModelKind; numClasses: number } | null {
  if (shape.length === 2 && numAt(shape, 1) >= 1) {
    return { kind: 'classifier', numClasses: numAt(shape, 1) };
  }
  if (shape.length === 3 && numAt(shape, 0) === 1) {
    const a = numAt(shape, 1);
    const b = numAt(shape, 2);
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

/** Numeric value at `index`, or 0 when the dim is symbolic or out of range. */
function numAt(shape: readonly (number | string)[], index: number): number {
  const d = shape[index];
  return typeof d === 'number' && Number.isFinite(d) ? d : 0;
}
