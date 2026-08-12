import { useEffect, useState } from 'react';
import type { ModelAvailability } from '@/ai/types';

/**
 * Resolves a model's availability (loading/ready/error/unavailable) and
 * exposes a retry that force-reloads the adapter.
 *
 * `forceReload` (e.g. clears a cached rejected promise in the model manager)
 * is called before the next attempt.
 */
export function useModelAvailability(
  load: () => Promise<ModelAvailability>,
  forceReload: () => void,
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
  }, [load, retryCount]);

  return {
    availability,
    retry: () => {
      forceReload();
      setAvailability({ state: 'loading' });
      setRetryCount((count) => count + 1);
    },
  };
}