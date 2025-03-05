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

  // Use the backend API instead of direct XTB connection
  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      try {
        console.log('[useXTB] Fetching rates from backend API');
        const response = await fetch('/api/xtb/rates');
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`[useXTB] API error: ${errorData}`);
          throw new Error(`Failed to fetch rates: ${response.status}`);
        }
        
        const rates = await response.json();
        console.log('[useXTB] Rates from backend:', rates);
        
        if (!Array.isArray(rates) || rates.length === 0) {
          throw new Error('No exchange rates available');
        }
        
        return rates as ExchangeRate[];
      } catch (error: any) {
        console.error('[useXTB] Error fetching rates:', error);
        setError(error.message);
        
        toast({
          variant: "destructive",
          title: "Exchange Rate Error",
          description: error.message,
        });
        
        throw error;
      }
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    retry: 3,
  });

  // We're always considered "connected" when using the backend API
  const isConnected = true;

  return {
    isConnected,
    error,
    exchangeRates,
    isLoading,
  };
}