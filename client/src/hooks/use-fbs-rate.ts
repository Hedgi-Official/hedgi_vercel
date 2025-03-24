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
    queryKey: ['fbsRate', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/fbs-rate?symbol=${symbol}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch FBS rate');
      }
      
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 4000,
  });
}