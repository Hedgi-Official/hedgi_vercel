import { useQuery } from '@tanstack/react-query';

interface ActiveTradesRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
}

export function useActiveTradesRate(symbol: string = 'USDBRL') {
  return useQuery({
    queryKey: ['activtrades-rate', symbol],
    queryFn: async () => {
      try {
        console.log('Fetching ActiveTrades rate for', symbol);

        const response = await fetch(`/api/activtrades-rate?symbol=${symbol}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as ActiveTradesRateResponse;
        console.log('ActiveTrades rate data:', data);
        return data;
      } catch (error) {
        console.error('ActiveTrades rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// Keeping the old function name for backward compatibility
export function useFBSRate(symbol: string = 'USDBRL') {
  return useActiveTradesRate(symbol);
}