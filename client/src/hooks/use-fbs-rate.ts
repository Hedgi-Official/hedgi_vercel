import { useQuery } from "@tanstack/react-query";

export interface FBSRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
  broker: string;
}

/**
 * Hook for fetching exchange rates from FBS broker
 * @param symbol Currency pair symbol (default: USDBRL)
 * @returns Query result with rate data
 */
export function useFBSRate(symbol: string = 'USDBRL') {
  return useQuery<FBSRateResponse, Error>({
    queryKey: ['fbs-rate', symbol],
    queryFn: async () => {
      try {
        console.log('[useFBSRate] Fetching rate for', symbol);

        const response = await fetch(`/api/fbs-rate?symbol=${symbol}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as FBSRateResponse;
        console.log('[useFBSRate] Rate data:', data);
        return data;
      } catch (error) {
        console.error('[useFBSRate] Rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 4000, // Consider data fresh for 4 seconds to prevent overlapping requests
    refetchOnMount: false, // Don't refetch on component remount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}