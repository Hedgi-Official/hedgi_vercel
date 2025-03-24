import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

export interface TickmillRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
  broker: string;
}

export function useTickmillRate(symbol: string = 'USDBRL') {
  const fetchRate = useCallback(async (): Promise<TickmillRateResponse> => {
    console.log(`[useTickmillRate] Fetching rate for`, symbol);
    const response = await fetch(`/api/tickmill-rate?symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Tickmill rate: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[useTickmillRate] Rate data:`, data);
    return data;
  }, [symbol]);

  return useQuery<TickmillRateResponse, Error>({
    queryKey: ['tickmill-rate', symbol],
    queryFn: fetchRate,
    refetchInterval: 5000, // Refetch every 5 seconds to keep rates "live"
    retry: 3,
    staleTime: 4000,
  });
}