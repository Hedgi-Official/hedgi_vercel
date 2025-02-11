
import { useQuery } from '@tanstack/react-query';

interface SecondaryRateResponse {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  symbol: string;
}

export function useSecondaryRate() {
  return useQuery({
    queryKey: ['secondary-rate'],
    queryFn: async () => {
      try {
        console.log('Fetching secondary rate...');
        const response = await fetch('http://0.0.0.0:8080/symbol_info?symbol=USDBRL', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Secondary rate data:', data);
        return data as SecondaryRateResponse;
      } catch (error) {
        console.error('Secondary rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000,
  });
}
