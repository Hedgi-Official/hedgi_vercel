
import { useQuery } from '@tanstack/react-query';
import { spawn } from 'child_process';

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
        
        return new Promise<SecondaryRateResponse>((resolve, reject) => {
          const curl = spawn('curl', [
            '-H', 
            'skip_zrok_interstitial: true',
            'https://5pxoe9wu00tf.share.zrok.io/symbol_info?symbol=USDBRL'
          ]);

          let data = '';
          
          curl.stdout.on('data', (chunk) => {
            data += chunk;
          });

          curl.stderr.on('data', (data) => {
            console.error('curl stderr:', data.toString());
          });

          curl.on('close', (code) => {
            if (code !== 0) {
              reject(new Error(`curl process exited with code ${code}`));
              return;
            }
            try {
              const response = JSON.parse(data);
              console.log('Secondary rate data:', response);
              resolve(response);
            } catch (error) {
              reject(error);
            }
          });
        });
      } catch (error) {
        console.error('Secondary rate fetch error:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
