import { useQuery } from '@tanstack/react-query';

interface FBSRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
}

export function useFBSRate(symbol: string = 'USDBRL') {
  return useQuery({
    queryKey: ['fbs-rate', symbol],
    queryFn: async () => {
      try {
        console.log('Fetching FBS rate for', symbol);

        const response = await fetch(`/api/fbs-rate?symbol=${symbol}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as FBSRateResponse;
        console.log('FBS rate data:', data);
        return data;
      } catch (error) {
        console.error('FBS rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}