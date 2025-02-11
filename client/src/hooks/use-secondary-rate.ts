
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
        const response = await fetch('https://5pxoe9wu00tf.share.zrok.io/symbol_info?symbol=USDBRL', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'skip_zrok_interstitial': 'true'
          },
          mode: 'cors',
        });
        
        if (response.status === 429) {
          throw new Error('Please approve the ngrok URL by visiting it in your browser first');
        }
        
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
