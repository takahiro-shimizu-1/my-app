/**
 * Hook for fetching and caching the orderer list.
 *
 * Replaces the former top-level `await` pattern in data/orderers.ts.
 * Data is fetched once on mount and cached in state.
 */
import { useState, useEffect } from 'react';
import type { Orderer } from '../types/orderer';
import { fetchOrderers } from '../data/api/ordererApi';

interface UseOrderersResult {
  orderers: Orderer[];
  isLoading: boolean;
  error: string | null;
}

export function useOrderers(): UseOrderersResult {
  const [orderers, setOrderers] = useState<Orderer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchOrderers({ signal: controller.signal });
        setOrderers(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to fetch orderers:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setOrderers([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, []);

  return { orderers, isLoading, error };
}
