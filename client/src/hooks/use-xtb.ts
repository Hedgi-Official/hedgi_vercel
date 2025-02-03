import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { xtbService } from '@/lib/xtb-service';

export interface ExchangeRate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
}

export function useXTB() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await xtbService.connect({
    userId: '17474971',
    password: 'xoh74681',
  });
        setIsConnected(true);
        setError(null);
      } catch (err: any) {
        console.error('XTB connection error:', err);
        setError(err.message);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      xtbService.disconnect();
    };
  }, []);

  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
      const rates: ExchangeRate[] = [];

      for (const symbol of symbols) {
        try {
          const response = await xtbService.getTickPrices(symbol);
          if (response.status) {
            rates.push({
              symbol,
              bid: response.returnData.bid,
              ask: response.returnData.ask,
              timestamp: response.returnData.timestamp,
            });
          }
        } catch (error) {
          console.error(`Error fetching rates for ${symbol}:`, error);
        }
      }

      return rates;
    },
    enabled: isConnected,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return {
    isConnected,
    error,
    exchangeRates,
    isLoading,
  };
}