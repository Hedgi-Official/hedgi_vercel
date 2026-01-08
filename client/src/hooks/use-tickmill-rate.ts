import { useQuery } from '@tanstack/react-query';

export interface TickmillRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
  broker: string;
}

const inFlightRequests = new Map<string, Promise<TickmillRateResponse>>();

export function useTickmillRate(symbol: string = 'USDBRL') {
  return useQuery({
    queryKey: ['tickmill-rate', symbol],
    queryFn: async ({ signal }) => {
      const requestKey = `tickmill-rate-${symbol}`;
      
      if (inFlightRequests.has(requestKey)) {
        console.log('[useTickmillRate] Request already in-flight for', symbol, '- reusing');
        return inFlightRequests.get(requestKey)!;
      }
      
      const fetchPromise = (async () => {
        try {
          console.log('[useTickmillRate] Fetching rate for', symbol);

          const response = await fetch(`/api/tickmill-rate?symbol=${symbol}`, { signal });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json() as TickmillRateResponse;
          console.log('[useTickmillRate] Rate data:', data);
          return data;
        } catch (error) {
          console.error('[useTickmillRate] Rate fetch error:', error);
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