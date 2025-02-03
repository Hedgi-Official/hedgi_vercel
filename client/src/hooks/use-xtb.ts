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
        console.log('Connecting to XTB...');
        await xtbService.connect({
    userId: '17474971',
    password: 'xoh74681',
  });
        console.log('Connected to XTB successfully');
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
      console.log('Fetching exchange rates...');
      const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
      const rates: ExchangeRate[] = [];

      for (const symbol of symbols) {
        try {
          console.log(`Fetching rates for ${symbol}...`);
          const response = await xtbService.getTickPrices(symbol);
          console.log(`Received response for ${symbol}:`, response);

          if (response.status && response.returnData) {
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

      console.log('Final rates:', rates);
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