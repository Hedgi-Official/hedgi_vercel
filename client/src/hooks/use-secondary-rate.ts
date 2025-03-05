import { useQuery } from '@tanstack/react-query';

interface FBSRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
  error?: string;
}

// Fallback rates to use if the API is unavailable
const getFallbackRate = (symbol: string): FBSRateResponse => {
  switch (symbol) {
    case 'USDBRL':
      return {
        bid: 5.125,
        ask: 5.135,
        swap_long: 0.55,
        swap_short: 0.55,
        symbol: 'USDBRL'
      };
    case 'EURUSD':
      return {
        bid: 1.082,
        ask: 1.084,
        swap_long: 0.35,
        swap_short: 0.35,
        symbol: 'EURUSD'
      };
    case 'USDMXN':
      return {
        bid: 16.54,
        ask: 16.59,
        swap_long: 0.45,
        swap_short: 0.45,
        symbol: 'USDMXN'
      };
    default:
      return {
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        symbol: symbol
      };
  }
};

export function useFBSRate(symbol: string = 'USDBRL') {
  return useQuery<FBSRateResponse, Error>({
    queryKey: ['fbs-rate', symbol],
    queryFn: async () => {
      try {
        console.log('[useFBSRate] Fetching secondary rate for', symbol);

        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const response = await fetch(`/api/fbs-rate?symbol=${symbol}`, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[useFBSRate] Server returned ${response.status} for ${symbol}`);
          return getFallbackRate(symbol);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`[useFBSRate] Received non-JSON response: ${contentType}`);
          return getFallbackRate(symbol);
        }

        const data = await response.json() as FBSRateResponse;
        
        if (data.error || typeof data.bid !== 'number' || data.bid === 0) {
          console.warn('[useFBSRate] Invalid data received:', data);
          return getFallbackRate(symbol);
        }
        
        console.log('[useFBSRate] Successful rate fetch:', data);
        return data;
      } catch (error) {
        console.error('[useFBSRate] Error fetching rate:', error);
        return getFallbackRate(symbol);
      }
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    retry: 1,
    // Don't rethrow errors
    retryOnMount: true,
  });
}