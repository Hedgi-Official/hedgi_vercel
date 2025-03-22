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
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}