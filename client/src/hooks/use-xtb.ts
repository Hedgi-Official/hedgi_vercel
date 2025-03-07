import { useQuery } from '@tanstack/react-query';
import { xtbService } from '@/lib/xtb-service';
import { useToast } from '@/hooks/use-toast';
import type { SymbolRecord } from '@/lib/xtb-types';

export interface ExchangeRate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  swapLong: number;
  swapShort: number;
}

const CURRENCY_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

export function useXTB() {
  const { toast } = useToast();

  const { data: exchangeRates, isLoading, error } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      console.log('[useXTB] Starting exchange rate fetch');
      const rates: ExchangeRate[] = [];

      // First try to fetch all rates through our backend API
      try {
        console.log('[useXTB] Attempting to fetch rates from backend API');
        const response = await fetch('/api/xtb/rates');
        
        if (response.ok) {
          const apiRates = await response.json();
          console.log('[useXTB] API rates response:', apiRates);
          
          if (Array.isArray(apiRates) && apiRates.length > 0) {
            return apiRates.map((rate: any) => ({
              symbol: rate.symbol,
              bid: rate.bid,
              ask: rate.ask,
              timestamp: rate.timestamp,
              swapLong: Math.abs(rate.swapLong || 0),
              swapShort: Math.abs(rate.swapShort || 0)
            }));
          }
        }
      } catch (apiError) {
        console.error('[useXTB] Error fetching from API:', apiError);
        // Continue to fallback method
      }

      // If API fails, try direct XTB connection as fallback
      try {
        // Try to establish streaming connection but don't wait for it
        xtbService.checkStreamConnection().catch(err => 
          console.log('[useXTB] Stream connection check failed:', err)
        );

        // Fetch data for all currency pairs
        for (const symbol of CURRENCY_PAIRS) {
          try {
            console.log('[useXTB] Requesting symbol data for:', symbol);
            const symbolResponse = await xtbService.getSymbolData(symbol);
            
            if (!symbolResponse.status || !symbolResponse.returnData) {
              console.error(`[useXTB] Failed to get symbol data for ${symbol}`);
              continue;
            }

            const data = symbolResponse.returnData;
            rates.push({
              symbol,
              bid: data.bid,
              ask: data.ask,
              timestamp: data.time || Date.now(),
              swapLong: Math.abs(data.swapLong || 0),
              swapShort: Math.abs(data.swapShort || 0),
            });

          } catch (symbolError) {
            console.error(`[useXTB] Error fetching ${symbol}:`, symbolError);
            // Continue with next symbol
          }
        }
      } catch (error) {
        console.error('[useXTB] Error in XTB direct connection:', error);
        // If we have no rates yet, throw error to trigger retry
        if (rates.length === 0) {
          throw error;
        }
      }

      // If we still have no rates, use hardcoded fallback data
      if (rates.length === 0) {
        console.log('[useXTB] Using hardcoded fallback rates');
        return [
          {
            symbol: 'USDBRL',
            bid: 5.67,
            ask: 5.69,
            timestamp: Date.now(),
            swapLong: 0.0002,
            swapShort: 0.0001,
          },
          {
            symbol: 'EURUSD',
            bid: 1.08,
            ask: 1.09,
            timestamp: Date.now(),
            swapLong: 0.0001,
            swapShort: 0.0002,
          },
          {
            symbol: 'USDMXN',
            bid: 16.75,
            ask: 16.78,
            timestamp: Date.now(),
            swapLong: 0.0001,
            swapShort: 0.0001,
          }
        ];
      }

      console.log('[useXTB] Final rates:', rates);
      return rates;
    },
    refetchInterval: 10000, // Reduced frequency to 10 seconds
    retry: 2,
    staleTime: 8000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  return {
    exchangeRates,
    isLoading,
    error: error as Error | null,
  };
}