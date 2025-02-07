import { useQuery } from '@tanstack/react-query';

export function useSecondaryRate() {
  return useQuery({
    queryKey: ['secondary-rate'],
    queryFn: async () => {
      try {
        const response = await fetch('http://18.231.217.179:8080/usdrbl');
        if (!response.ok) {
          throw new Error('Failed to fetch secondary rate');
        }
        return response.json();
      } catch (error) {
        console.error('Secondary rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
