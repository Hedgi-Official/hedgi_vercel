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
}

const CURRENCY_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

export function useXTB() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const connect = async () => {
      try {
        console.log('[useXTB] Connecting to XTB...');
        await xtbService.connect({
          userId: import.meta.env.VITE_XTB_USER_ID,
          password: import.meta.env.VITE_XTB_PASSWORD || 'xoh74681',
        });
        console.log('[useXTB] Connected to XTB successfully');
        setIsConnected(true);
        setError(null);

        toast({
          title: "Connected to XTB",
          description: "Successfully connected to trading platform",
        });
      } catch (err: any) {
        console.error('[useXTB] Connection error:', err);
        setError(err.message);
        setIsConnected(false);

        toast({
          variant: "destructive",
          title: "Connection Error",
          description: err.message,
        });
      }
    };

    connect();

    return () => {
      xtbService.disconnect();
    };
  }, [toast]);

  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      if (!isConnected) {
        throw new Error('Not connected to XTB');
      }

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