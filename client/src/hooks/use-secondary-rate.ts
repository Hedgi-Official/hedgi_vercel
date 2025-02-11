import { useQuery } from '@tanstack/react-query';

interface SecondaryRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
}

export function useSecondaryRate() {
  return useQuery({
    queryKey: ['secondary-rate'],
    queryFn: async () => {
      try {
        console.log('[Secondary Rate] Fetching rates...');
        const pairs = ['USDBRL', 'EURUSD', 'USDMXN'];
        const rates: Record<string, SecondaryRateResponse> = {};

        for (const symbol of pairs) {
          const response = await fetch(`http://192.168.1.103:8080/symbol_info?symbol=${symbol}`);
          console.log(`[Secondary Rate] Response for ${symbol}:`, response.status);

          if (!response.ok) {
            console.error(`[Secondary Rate] Failed to fetch ${symbol}:`, response.statusText);
            throw new Error(`Failed to fetch secondary rate for ${symbol}`);
          }

          const data = await response.json();
          console.log(`[Secondary Rate] Data for ${symbol}:`, data);
          rates[symbol] = data;
        }

        return rates;
      } catch (error) {
        console.error('[Secondary Rate] Fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}