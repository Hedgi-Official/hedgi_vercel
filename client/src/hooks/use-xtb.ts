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

export function useXTB() {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      try {
        console.log('[useXTB] Fetching exchange rates from API...');
        const response = await fetch('/api/xtb/rates');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch rates: ${response.status} ${errorText}`);
        }
        
        const rates = await response.json() as ExchangeRate[];
        console.log('[useXTB] Received rates from API:', rates);
        
        if (rates.length === 0) {
          throw new Error('No exchange rates available');
        }
        
        return rates;
      } catch (error: any) {
        console.error('[useXTB] Error fetching rates:', error);
        setError(error.message);
        
        toast({
          variant: "destructive",
          title: "Error Fetching Rates",
          description: error.message,
        });
        
        throw error;
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
  });

  return {
    isConnected: true, // Always return true since we're using HTTP API
    error,
    exchangeRates,
    isLoading,
  };
}