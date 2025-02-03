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
      if (!isConnected) {
        throw new Error('Not connected to XTB');
      }

      const symbols = ['USDBRL', 'EURUSD', 'GBPUSD'];
      const rates: ExchangeRate[] = [];

      for (const symbol of symbols) {
        const response = await xtbService.getTickPrices(symbol);
        if (response.status && response.returnData) {
          rates.push({
            symbol,
            bid: response.returnData.bid,
            ask: response.returnData.ask,
            timestamp: response.returnData.timestamp,
          });
        }
      }

      return rates;
    },
    enabled: isConnected,
    refetchInterval: 1000,
    retry: 3,
  });

  return {
    isConnected,
    error,
    exchangeRates,
    isLoading,
  };
}