/**
 * Tiny performance tracker for the debug overlay.
 *
 * Used by the scan engine to record cycle latency (camera→inference→output)
 * and preview frame pacing. Subscribed to with useSyncExternalStore.
 *
 * getSnapshot MUST return a cached, stable object reference between store
 * changes — useSyncExternalStore errors with an infinite loop otherwise.
 */

export interface PerfSnapshot {
  previewFps: number;
  inferenceFps: number;
  /** Average end-to-end latency of the last cycles (ms). */
  avgCycleLatencyMs: number;
  /** Latency of the most recent cycle (ms). */
  lastCycleLatencyMs: number;
  /** Number of completed inference cycles. */
  cycles: number;
}

const WINDOW_MS = 2000;

const ZERO_SNAPSHOT: PerfSnapshot = {
  previewFps: 0,
  inferenceFps: 0,
  avgCycleLatencyMs: 0,
  lastCycleLatencyMs: 0,
  cycles: 0,
};

class PerfTracker {
  private previewFrames: number[] = [];
  private cycles: { at: number; latencyMs: number }[] = [];
  private totalCycles = 0;
  private lastEmit = 0;
  private listeners = new Set<() => void>();

  /** Stable reference returned by getSnapshot; recomputed only on record events. */
  private snapshot: PerfSnapshot = ZERO_SNAPSHOT;

  recordPreviewFrame(now = Date.now()): void {
    this.previewFrames.push(now);
    this.prune(this.previewFrames, now);
    this.refresh();
    this.maybeEmit();
  }

  recordCycle(latencyMs: number, now = Date.now()): void {
    this.cycles.push({ at: now, latencyMs });
    this.pruneCycles(now);
    this.totalCycles++;
    this.refresh();
    this.maybeEmit();
  }

  reset(): void {
    this.previewFrames = [];
    this.cycles = [];
    this.totalCycles = 0;
    this.snapshot = { ...ZERO_SNAPSHOT };
  }

  // Arrow function property: binding survives when passed by reference to
  // useSyncExternalStore.
  getSnapshot = (): PerfSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private refresh(): void {
    const now = Date.now();
    this.prune(this.previewFrames, now);
    this.pruneCycles(now);
    const fps = this.previewFrames.length / (WINDOW_MS / 1000) || 0;
    const infFps = this.cycles.length / (WINDOW_MS / 1000) || 0;
    const avg =
      this.cycles.length > 0
        ? this.cycles.reduce((s, c) => s + c.latencyMs, 0) / this.cycles.length
        : 0;
    const last =
      this.cycles.length > 0
        ? this.cycles[this.cycles.length - 1].latencyMs
        : 0;
    this.snapshot = {
      previewFps: Math.round(fps * 10) / 10,
      inferenceFps: Math.round(infFps * 10) / 10,
      avgCycleLatencyMs: Math.round(avg),
      lastCycleLatencyMs: Math.round(last),
      cycles: this.totalCycles,
    };
  }

  private maybeEmit(): void {
    const now = Date.now();
    if (now - this.lastEmit < 500) return;
    this.lastEmit = now;
    this.listeners.forEach((l) => l());
  }

  private prune(list: number[], now: number): void {
    const cutoff = now - WINDOW_MS;
    while (list.length > 0 && list[0] < cutoff) list.shift();
  }

  private pruneCycles(now: number): void {
    const cutoff = now - WINDOW_MS;
    while (this.cycles.length > 0 && this.cycles[0].at < cutoff) {
      this.cycles.shift();
    }
  }
}

export const perf = new PerfTracker();