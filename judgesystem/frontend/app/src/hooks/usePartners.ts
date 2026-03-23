/**
 * Hook for fetching and caching the partner list.
 *
 * Replaces the former top-level `await` pattern in data/partners.ts.
 * Data is fetched once on mount and cached in state.
 */
import { useState, useEffect } from 'react';
import type { PartnerListItem } from '../types';
import { fetchPartnerList } from '../data/api/partnerApi';

interface UsePartnersResult {
  partners: PartnerListItem[];
  isLoading: boolean;
  error: string | null;
}

export function usePartners(): UsePartnersResult {
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchPartnerList({ signal: controller.signal });
        setPartners(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to fetch partners:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setPartners([]);
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

  return { partners, isLoading, error };
}
