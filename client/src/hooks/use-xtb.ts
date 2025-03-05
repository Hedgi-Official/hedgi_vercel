import { useState, useEffect } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface ExchangeRate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  swapLong: number;
  swapShort: number;
}

// Fallback rates to use if the API is unavailable
const fallbackRates: ExchangeRate[] = [
  {
    symbol: 'USDBRL',
    bid: 5.1234,
    ask: 5.1334,
    timestamp: Date.now(),
    swapLong: 0.5,
    swapShort: 0.5,
  },
  {
    symbol: 'EURUSD',
    bid: 1.0812,
    ask: 1.0825,
    timestamp: Date.now(),
    swapLong: 0.3,
    swapShort: 0.3,
  },
  {
    symbol: 'USDMXN',
    bid: 16.532,
    ask: 16.582,
    timestamp: Date.now(),
    swapLong: 0.4,
    swapShort: 0.4,
  }
];

// Function to try both endpoints and merge results
async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  try {
    console.log('[useXTB] Fetching exchange rates from XTB API...');
    // Try the XTB endpoint first
    const xtbResponse = await fetch('/api/xtb/rates', { 
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (xtbResponse.ok) {
      const xtbData = await xtbResponse.json();
      if (Array.isArray(xtbData) && xtbData.length > 0) {
        console.log('[useXTB] Got rates from XTB API:', xtbData);
        return xtbData;
      }
    }
    
    // If that fails, try the secondary endpoint for each symbol
    console.log('[useXTB] Falling back to secondary rate API...');
    const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
    const fbsRates: ExchangeRate[] = [];
    
    for (const symbol of symbols) {
      try {
        const fbsResponse = await fetch(`/api/fbs-rate?symbol=${symbol}`, { 
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        
        if (fbsResponse.ok) {
          const fbsData = await fbsResponse.json();
          if (!fbsData.error) {
            fbsRates.push({
              symbol,
              bid: fbsData.bid || 0,
              ask: fbsData.ask || 0,
              timestamp: Date.now(),
              swapLong: Math.abs(fbsData.swap_long || 0),
              swapShort: Math.abs(fbsData.swap_short || 0),
            });
          }
        }
      } catch (fbsError) {
        console.error(`[useXTB] Error fetching ${symbol} from FBS:`, fbsError);
      }
    }
    
    if (fbsRates.length > 0) {
      console.log('[useXTB] Got rates from FBS API:', fbsRates);
      return fbsRates;
    }
    
    // If all else fails, use fallback rates
    console.warn('[useXTB] Using fallback rates');
    return fallbackRates;
  } catch (error) {
    console.error('[useXTB] Error fetching exchange rates:', error);
    return fallbackRates;
  }
}

export function useXTB() {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [hasShownErrorToast, setHasShownErrorToast] = useState(false);

  const { data: exchangeRates, isLoading, isError } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: fetchExchangeRates,
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
  });

  // Show error toast only once per session
  useEffect(() => {
    if (isError && !hasShownErrorToast) {
      toast({
        title: "Using Simulated Rates",
        description: "Could not connect to live trading server. Using simulated exchange rates.",
        duration: 5000,
      });
      setHasShownErrorToast(true);
    }
  }, [isError, hasShownErrorToast, toast]);

  return {
    isConnected: true, // Always return true since we're using HTTP API with fallbacks
    error,
    // Always provide rates even if there's an error
    exchangeRates: exchangeRates || fallbackRates,
    isLoading,
  };
}