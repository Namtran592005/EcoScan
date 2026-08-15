import { useSyncExternalStore } from 'react';
import { perf, type PerfSnapshot } from '@/utils/perf';

/** Live perf snapshot for the debug overlay (~2 Hz refreshes). */
export function usePerfStats(): PerfSnapshot {
  return useSyncExternalStore(perf.subscribe, perf.getSnapshot, perf.getSnapshot);
}