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
 * Hook to fetch FBS exchange rates
 * @param symbol Currency pair symbol (e.g., "USDBRL")
 * @returns Query result with FBS rate data
 */
export function useFBSRate(symbol: string = 'USDBRL') {
  return useQuery<FBSRateResponse, Error>({
    queryKey: ['fbs-rate', symbol],
    queryFn: async () => {
      console.log("[useFBSRate] Fetching rate for", symbol);
      const response = await fetch(`/api/fbs-rate?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch FBS rate: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("[useFBSRate] Rate data:", data);
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true,
    retry: 3,
  });
}