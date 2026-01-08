import { useQuery } from '@tanstack/react-query';

export interface ActivTradesRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
  broker: string;
}

const inFlightRequests = new Map<string, Promise<ActivTradesRateResponse>>();

export function useActivTradesRate(symbol: string = 'USDBRL') {
  return useQuery({
    queryKey: ['activtrades-rate', symbol],
    queryFn: async ({ signal }) => {
      const requestKey = `activtrades-rate-${symbol}`;
      
      if (inFlightRequests.has(requestKey)) {
        console.log('[useActivTradesRate] Request already in-flight for', symbol, '- reusing');
        return inFlightRequests.get(requestKey)!;
      }
      
      const fetchPromise = (async () => {
        try {
          console.log('[useActivTradesRate] Fetching rate for', symbol);

          const response = await fetch(`/api/activtrades-rate?symbol=${symbol}`, { signal });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json() as ActivTradesRateResponse;
          console.log('[useActivTradesRate] Rate data:', data);
          return data;
        } catch (error) {
          console.error('[useActivTradesRate] Rate fetch error:', error);
          return {
            bid: 0,
            ask: 0,
            swap_long: 0,
            swap_short: 0,
            symbol: symbol,
            broker: 'activtrades',
            error: 'Failed to fetch rate'
          } as ActivTradesRateResponse;
        } finally {
          inFlightRequests.delete(requestKey);
        }
      })();
      
      inFlightRequests.set(requestKey, fetchPromise);
      return fetchPromise;
    },
    refetchInterval: 15000,
    staleTime: 12000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 3000,
  });
}