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
    staleTime: 4000, // Consider data fresh for 4 seconds to prevent overlapping requests
    refetchOnMount: false, // Don't refetch on component remount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}