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

export function useXTB() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const connect = async () => {
      try {
        console.log('[useXTB] Connecting to XTB...');
        await xtbService.connect({
          userId: import.meta.env.VITE_XTB_USER_ID || '17474971',
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
      console.log('[useXTB] Fetching exchange rates...');
      if (!isConnected) {
        console.error('[useXTB] Not connected to XTB');
        throw new Error('Not connected to XTB');
      }

      try {
        // First verify stream connection
        const streamStatus = await xtbService.checkStreamConnection();
        console.log('[useXTB] Stream connection status:', streamStatus);
        
        const symbols = ['EURUSD'];
        const rates: ExchangeRate[] = [];
        // First get all available symbols
        console.log('[useXTB] Requesting all symbols...');
        const symbolsResponse = await xtbService.getAllSymbols();
        console.log('[useXTB] Available symbols:', symbolsResponse);

        // Create a map for quick symbol lookup and log available symbols
        const availableSymbols = new Map<string, SymbolRecord>();
        for (const symbol of symbolsResponse) {
          availableSymbols.set(symbol.symbol, symbol);
          // Log each available symbol to help debug
          console.log(`[useXTB] Available symbol: ${symbol.symbol} (${symbol.description})`);
        }

        // Only fetch prices for symbols that exist
        for (const symbol of symbols) {
          if (!availableSymbols.has(symbol)) {
            console.warn(`[useXTB] Symbol ${symbol} not available, checking for alternative formats...`);
            // Try to find a similar symbol (e.g., if USDBRL doesn't exist, maybe USD/BRL does)
            const alternativeSymbol = Array.from(availableSymbols.keys()).find(
              s => s.replace(/[^A-Z]/g, '') === symbol
            );
            if (alternativeSymbol) {
              console.log(`[useXTB] Found alternative symbol format: ${alternativeSymbol}`);
              continue;
            }
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

              // Set up streaming updates for this symbol
              xtbService.onSymbolUpdate(symbol, (candleData) => {
                console.log(`[useXTB] Received streaming update for ${symbol}:`, candleData);
              });
            } else {
              console.error(`[useXTB] Invalid response for ${symbol}:`, response);
            }
          } catch (error) {
            console.error(`[useXTB] Error fetching rates for ${symbol}:`, error);
          }
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