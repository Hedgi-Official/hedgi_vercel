import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { xtbService } from '@/lib/xtb-service';
import { useToast } from '@/hooks/use-toast';

export interface ExchangeRate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
}

export function useXTB() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const connect = async () => {
      try {
        console.log('[useXTB] Connecting to XTB...');
        await xtbService.connect({
          userId: '17474971',
          password: 'xoh74681',
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
      console.log('[useXTB] Fetching exchange rates...');
      const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
      const rates: ExchangeRate[] = [];

      try {
        // First get all available symbols to validate our symbol list
        const symbolsResponse = await xtbService.getAllSymbols();
        console.log('[useXTB] Available symbols:', symbolsResponse);

        if (!symbolsResponse.status || !Array.isArray(symbolsResponse.returnData)) {
          throw new Error('Failed to get available symbols');
        }

        const availableSymbols = new Set(
          symbolsResponse.returnData.map((s: any) => s.symbol)
        );

        // Only fetch prices for symbols that exist
        for (const symbol of symbols) {
          if (!availableSymbols.has(symbol)) {
            console.warn(`[useXTB] Symbol ${symbol} not available, skipping`);
            continue;
          }

          try {
            console.log(`[useXTB] Fetching rates for ${symbol}...`);
            const response = await xtbService.getTickPrices(symbol);
            console.log(`[useXTB] Received response for ${symbol}:`, response);

            if (response.status && response.returnData) {
              rates.push({
                symbol,
                bid: response.returnData.bid,
                ask: response.returnData.ask,
                timestamp: response.returnData.timestamp,
              });
            }
          } catch (error) {
            console.error(`[useXTB] Error fetching rates for ${symbol}:`, error);
          }
        }
      } catch (error) {
        console.error('[useXTB] Error in exchange rates query:', error);
        throw error;
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