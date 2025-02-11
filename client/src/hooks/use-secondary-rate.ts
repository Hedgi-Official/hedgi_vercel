import { useQuery } from '@tanstack/react-query';

interface SecondaryRateResponse {
  bid: number;
  ask: number;
}

export function useSecondaryRate() {
  return useQuery({
    queryKey: ['secondary-rate'],
    queryFn: async () => {
      try {
        const response = await fetch('http://192.168.1.103:8080/symbol_info?symbol=USDBRL');
        if (!response.ok) {
          throw new Error('Failed to fetch secondary rate');
        }
        return response.json() as Promise<SecondaryRateResponse>;
      } catch (error) {
        console.error('Secondary rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}