import { useSyncExternalStore } from 'react';

/**
 * In-memory app settings (debug overlay toggle). No persistence required;
 * kept intentionally tiny to avoid extra dependencies.
 */

let debugEnabled = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function setDebugEnabled(value: boolean): void {
  if (debugEnabled === value) return;
  debugEnabled = value;
  emit();
}

export function useDebugEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isDebugEnabled,
  );
}