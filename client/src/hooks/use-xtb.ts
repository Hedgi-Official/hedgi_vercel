import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use the server-side API endpoint instead of direct WebSocket connection
  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      console.log('[useXTB] Fetching rates from server API');
      
      try {
        const response = await fetch('/api/xtb/rates');
        
        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `Server responded with ${response.status}`;
          console.error(`[useXTB] API error: ${errorMessage}`);
          setError(errorMessage);
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('[useXTB] Server rates response:', data);
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('No exchange rates available from server');
        }
        
        return data as ExchangeRate[];
      } catch (error: any) {
        console.error('[useXTB] Error fetching rates:', error);
        setError(error.message);
        throw error;
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
  });

  return {
    isConnected: Boolean(exchangeRates && exchangeRates.length > 0),
    error,
    exchangeRates,
    isLoading,
  };
}