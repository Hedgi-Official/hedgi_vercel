import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { ExchangeRate } from '@/types/exchange-rate';

/**
 * Hook to fetch exchange rates from the new broker API endpoint
 * This implementation replaces the old XTB WebSocket connection with REST API calls
 */
export function useXTB() {
  const { toast } = useToast();

  const { data: exchangeRates, isLoading, error } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      console.log('[useXTB] Fetching exchange rates from API');
      
      try {
        // Use the server endpoint that aggregates rates from different brokers
        const response = await fetch('/api/xtb/rates');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const rates = await response.json() as ExchangeRate[];
        
        if (!Array.isArray(rates) || rates.length === 0) {
          throw new Error('No exchange rates available');
        }
        
        console.log('[useXTB] Received rates:', rates);
        return rates;
      } catch (error) {
        console.error('[useXTB] Error fetching exchange rates:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 3,
    staleTime: 4000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  return {
    exchangeRates,
    isLoading,
    error: error as Error | null,
  };
}