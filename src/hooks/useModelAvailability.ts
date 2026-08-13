import { useEffect, useState } from 'react';
import type { ModelAvailability } from '@/ai/types';

/**
 * Resolves a model's availability (loading/ready/error/unavailable/missing)
 * and exposes a retry that force-reloads the adapter.
 *
 * `forceReload` (e.g. clears a cached rejected promise in the model manager)
 * is called before the next attempt. `reloadKey` re-runs the resolution
 * without a manual retry — pass the model-store version so the scan screen
 * picks up models added/removed in Settings.
 */
export function useModelAvailability(
  load: () => Promise<ModelAvailability>,
  forceReload: () => void,
  reloadKey = 0,
): { availability: ModelAvailability; retry: () => void } {
  const [availability, setAvailability] = useState<ModelAvailability>({
    state: 'not-loaded',
  });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (!cancelled) setAvailability(result);
    });
    return () => {
      cancelled = true;
    };
  }, [load, retryCount, reloadKey]);

  return {
    availability,
    retry: () => {
      forceReload();
      setAvailability({ state: 'loading' });
      setRetryCount((count) => count + 1);
    },
  };
}
