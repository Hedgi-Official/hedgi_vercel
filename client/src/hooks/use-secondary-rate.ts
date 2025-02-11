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

        // Execute curl command
        const response = await fetch('/api/secondary-rate');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as SecondaryRateResponse;
        console.log('Secondary rate data:', data);
        return data;
      } catch (error) {
        console.error('Secondary rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}