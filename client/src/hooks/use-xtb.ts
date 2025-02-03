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
        throw new Error('Not connected to XTB');
      }

      const streamStatus = await xtbService.checkStreamConnection();
      console.log('[useXTB] Stream connection status:', streamStatus);

      const rates: ExchangeRate[] = [];
      const symbol = 'EURUSD';

      try {
        const tickResponse = await xtbService.getTickPrices(symbol);
        console.log('[useXTB] Tick response:', tickResponse);

        if (!tickResponse.status) {
          throw new Error(tickResponse.errorDescr || 'Failed to get tick prices');
        }

        rates.push({
          symbol,
          bid: tickResponse.returnData.bid,
          ask: tickResponse.returnData.ask,
          timestamp: tickResponse.returnData.timestamp,
        });
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