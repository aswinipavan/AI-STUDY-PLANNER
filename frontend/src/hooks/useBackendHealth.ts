import { useQuery } from '@tanstack/react-query';

/**
 * useBackendHealth — Singleton hook that gates all API calls behind backend readiness.
 * 
 * Calls GET /api/wake on mount and exposes `isReady: boolean`.
 * Once the backend is confirmed awake, the result is cached for the session
 * (staleTime: Infinity) so subsequent hook calls don't re-ping.
 * 
 * Used as an `enabled` guard by data-fetching hooks to prevent requests
 * from firing while the Render backend is cold-starting.
 */
export const useBackendHealth = () => {
  const query = useQuery({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const res = await fetch('/api/wake');
      if (!res.ok) {
        throw new Error('Backend health check failed');
      }
      const data = await res.json();
      if (data.status === 'awake') {
        return { ready: true, status: 'awake' as const };
      }
      // Backend is warming up — throw to trigger retry
      throw new Error('Backend is still warming up');
    },
    staleTime: Infinity, // Once awake, stays awake for the session
    gcTime: Infinity,
    retry: 10, // Keep retrying — cold starts can take 30-60s
    retryDelay: (attempt) => Math.min(3000 * Math.pow(1.5, attempt), 15000), // 3s → 4.5s → 6.75s → ... → 15s cap
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't re-check on every component mount
    refetchOnReconnect: true,
  });

  return {
    isReady: query.data?.ready === true,
    isWaking: query.isLoading || query.isFetching,
    isError: query.isError && !query.isFetching,
    status: query.data?.status ?? (query.isLoading ? 'warming' : 'unknown'),
  };
};
