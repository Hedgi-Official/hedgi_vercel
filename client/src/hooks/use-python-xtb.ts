
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { pythonXtbService } from '@/lib/python-xtb-service';
import type { ExchangeRate } from '@/types/currency';

const CURRENCY_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

export function usePythonXTB() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const connect = async () => {
      try {
        console.log('[usePythonXTB] Connecting to XTB via Python backend...');
        await pythonXtbService.connect();
        
        // Check connection health
        const health = await pythonXtbService.checkHealth();
        setIsConnected(health.connected);
        
        if (health.connected) {
          console.log('[usePythonXTB] Connected to XTB successfully');
          setError(null);
          
          toast({
            title: "Connected to XTB (Python)",
            description: "Successfully connected to trading platform",
          });
        } else {
          console.error('[usePythonXTB] Connection error:', health.message);
          setError(health.message);
          
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: health.message,
          });
        }
      } catch (err: any) {
        console.error('[usePythonXTB] Connection error:', err);
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
      // Disconnect when component unmounts
      pythonXtbService.disconnect();
    };
  }, [toast]);

  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['python-xtb-rates'],
    queryFn: async () => {
      if (!isConnected) {
        throw new Error('Not connected to XTB');
      }

      console.log('[usePythonXTB] Fetching exchange rates...');
      const rates: ExchangeRate[] = [];

      try {
        // Fetch data for all currency pairs
        for (const symbol of CURRENCY_PAIRS) {
          console.log('[usePythonXTB] Requesting symbol data for:', symbol);
          const symbolResponse = await pythonXtbService.getSymbolData(symbol);
          console.log('[usePythonXTB] Symbol response:', symbolResponse);

          if (!symbolResponse.status || !symbolResponse.returnData) {
            console.error(`[usePythonXTB] Failed to get symbol data for ${symbol}`);
            continue;
          }

          const data = symbolResponse.returnData;
          rates.push({
            symbol,
            bid: data.bid,
            ask: data.ask,
            timestamp: data.time,
            swapLong: Math.abs(data.swapLong),
            swapShort: Math.abs(data.swapShort),
          });
        }
      } catch (error) {
        console.error('[usePythonXTB] Error in exchange rates query:', error);
        throw error;
      }

      if (rates.length === 0) {
        throw new Error('No exchange rates available');
      }

      console.log('[usePythonXTB] Final rates:', rates);
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
    
    // Trade execution methods
    executeTrade: async (symbol: string, operation: 'buy' | 'sell', volume: number, options = {}) => {
      if (!isConnected) {
        throw new Error('Not connected to XTB');
      }
      return pythonXtbService.executeTrade(symbol, operation, volume, options);
    },
    
    getOpenTrades: async () => {
      if (!isConnected) {
        throw new Error('Not connected to XTB');
      }
      return pythonXtbService.getOpenTrades();
    },
    
    closeTrade: async (tradeId: number, volume = 0) => {
      if (!isConnected) {
        throw new Error('Not connected to XTB');
      }
      return pythonXtbService.closeTrade(tradeId, volume);
    }
  };
}
