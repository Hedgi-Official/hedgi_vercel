import { useQuery } from '@tanstack/react-query';

export interface ActivTradesRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
  broker: string;
}

export function useActivTradesRate(symbol: string = 'USDBRL') {
  return useQuery({
    queryKey: ['activtrades-rate', symbol],
    queryFn: async () => {
      try {
        console.log('[useActivTradesRate] Fetching rate for', symbol);

        const response = await fetch(`/api/activtrades-rate?symbol=${symbol}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as ActivTradesRateResponse;
        console.log('[useActivTradesRate] Rate data:', data);
        return data;
      } catch (error) {
        console.error('[useActivTradesRate] Rate fetch error:', error);
        // Return fallback data instead of throwing
        return {
          bid: 0,
          ask: 0,
          swap_long: 0,
          swap_short: 0,
          symbol: symbol,
          broker: 'activtrades',
          error: 'Failed to fetch rate'
        } as ActivTradesRateResponse;
      }
    },
    refetchInterval: 15000, // Refresh every 15 seconds (less frequent to reduce load)
    staleTime: 12000, // Consider data fresh for 12 seconds to prevent overlapping requests
    refetchOnMount: false, // Don't refetch on component remount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 2, // Retry failed requests 2 times
    retryDelay: 3000, // Wait 3 seconds between retries
  });
}