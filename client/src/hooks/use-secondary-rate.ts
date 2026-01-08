import { useQuery } from '@tanstack/react-query';

interface FBSRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
}

const inFlightRequests = new Map<string, Promise<FBSRateResponse>>();

export function useFBSRate(symbol: string = 'USDBRL') {
  return useQuery({
    queryKey: ['fbs-rate', symbol],
    queryFn: async ({ signal }) => {
      const requestKey = `fbs-rate-${symbol}`;
      
      if (inFlightRequests.has(requestKey)) {
        console.log('[useFBSRate] Request already in-flight for', symbol, '- reusing');
        return inFlightRequests.get(requestKey)!;
      }
      
      const fetchPromise = (async () => {
        try {
          console.log('Fetching FBS rate for', symbol);

          const response = await fetch(`/api/fbs-rate?symbol=${symbol}`, { signal });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json() as FBSRateResponse;
          console.log('FBS rate data:', data);
          return data;
        } catch (error) {
          console.error('FBS rate fetch error:', error);
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