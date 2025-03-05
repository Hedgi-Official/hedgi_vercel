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
      const streamStatus = await xtbService.checkStreamConnection();
      console.log('[useXTB] Stream connection status:', streamStatus);

      const rates: ExchangeRate[] = [];

      try {
        // Fetch data for all currency pairs
        for (const symbol of CURRENCY_PAIRS) {
          console.log('[useXTB] Requesting symbol data for:', symbol);
          const symbolResponse = await xtbService.getSymbolData(symbol);
          console.log('[useXTB] Symbol response:', symbolResponse);

          if (!symbolResponse.status || !symbolResponse.returnData) {
            console.error(`[useXTB] Failed to get symbol data for ${symbol}`);
            continue;
          }

          const data = symbolResponse.returnData as SymbolRecord;
          rates.push({
            symbol,
            bid: data.bid,
            ask: data.ask,
            timestamp: data.time,
            swapLong: Math.abs(data.swapLong),
            swapShort: Math.abs(data.swapShort),
          });

          // Set up streaming updates for this symbol
          xtbService.onSymbolUpdate(symbol, (symbolData) => {
            console.log(`[useXTB] Received streaming update for ${symbol}:`, symbolData);
          });
        }
      } catch (error) {
        console.error('[useXTB] Error in exchange rates query:', error);
        throw error;
      }

      if (rates.length === 0) {
        throw new Error('No exchange rates available');
      }

      console.log('[useXTB] Final rates:', rates);
      return rates;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 3,
    // Set staleTime to ensure we don't show stale data
    staleTime: 4000,
    // Initialize with previous data while fetching
    keepPreviousData: true,
  });

  return {
    exchangeRates,
    isLoading,
    error: error as Error | null,
  };
}