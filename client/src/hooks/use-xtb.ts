import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';

// Currency pairs supported by the application
const CURRENCY_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

export function useXTB() {
  const [isConnected, setIsConnected] = useState(true); // Assume server is connected
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if server API is reachable
    const checkServerConnection = async () => {
      try {
        console.log('[useXTB] Checking connection to server API...');
        const response = await axios.get('/api/xtb/rates');
        console.log('[useXTB] Server API is reachable');
        setIsConnected(true);
        setError(null);

        toast({
          title: "Connected to Trading API",
          description: "Successfully connected to trading platform",
        });
      } catch (err: any) {
        console.error('[useXTB] Server API error:', err);
        setError(err.message);
        setIsConnected(false);

        toast({
          variant: "destructive",
          title: "Connection Error",
          description: err.message,
        });
      }
    };

    checkServerConnection();

    // No cleanup needed since we're not connecting directly to XTB anymore
  }, [toast]);

  const { data: exchangeRates, isLoading } = useQuery({
    queryKey: ['xtb-rates'],
    queryFn: async () => {
      console.log('[useXTB] Fetching exchange rates from server API');
      const response = await axios.get('/api/xtb/rates');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: isConnected, // Only fetch if connected
  });

  return {
    isConnected,
    exchangeRates,
    isLoading,
    error,
  };
}