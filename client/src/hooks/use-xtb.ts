
import { useEffect, useState } from 'react';
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
  const [isConnected, setIsConnected] = useState(true); // Set to true immediately
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('[useXTB] Using server API for exchange rates - trades go through Flask server');
    
    return () => {
      // No need for cleanup
    };
  }, []);

  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      // Fetch rates directly from our server API
      try {
        const response = await fetch('/api/xtb/rates');
        if (!response.ok) {
          throw new Error(`Failed to fetch rates: ${response.status}`);
        }
        const data = await response.json();
        console.log('[useXTB] Loaded rates from server:', data);
        return data;
      } catch (err) {
        console.error('[useXTB] Error fetching rates:', err);
        throw err;
      }
    },
    initialData: [], // Provide empty initial data

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
    enabled: isConnected,
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 3,
  });

  return {
    isConnected,
    error,
    exchangeRates,
    isLoading,
  };
}
