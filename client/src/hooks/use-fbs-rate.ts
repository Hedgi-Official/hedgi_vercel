import { useQuery } from "@tanstack/react-query";

export interface FBSRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
  broker: string;
}

const inFlightRequests = new Map<string, Promise<FBSRateResponse>>();

/**
 * Hook for fetching exchange rates from FBS broker
 * @param symbol Currency pair symbol (default: USDBRL)
 * @returns Query result with rate data
 */
export function useFBSRate(symbol: string = 'USDBRL') {
  return useQuery<FBSRateResponse, Error>({
    queryKey: ['fbs-rate', symbol],
    queryFn: async ({ signal }) => {
      const requestKey = `fbs-rate-${symbol}`;
      
      if (inFlightRequests.has(requestKey)) {
        console.log('[useFBSRate] Request already in-flight for', symbol, '- reusing');
        return inFlightRequests.get(requestKey)!;
      }
      
      const fetchPromise = (async () => {
        try {
          console.log('[useFBSRate] Fetching rate for', symbol);

          const response = await fetch(`/api/fbs-rate?symbol=${symbol}`, { signal });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json() as FBSRateResponse;
          console.log('[useFBSRate] Rate data:', data);
          return data;
        } catch (error) {
          console.error('[useFBSRate] Rate fetch error:', error);
          throw error;
        } finally {
          inFlightRequests.delete(requestKey);
        }
      })();
      
      inFlightRequests.set(requestKey, fetchPromise);
      return fetchPromise;
    },
    refetchInterval: 5000,
    staleTime: 4000,
    refetchOnWindowFocus: false,
  });
}