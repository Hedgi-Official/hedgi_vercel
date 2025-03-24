import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

// Fallback data when the external API is unavailable
type RateData = {
  ask: number;
  bid: number;
  broker: string;
  swap_long: number;
  swap_short: number;
  symbol: string;
};

const FALLBACK_RATES: Record<string, RateData> = {
  'USDBRL': {
    ask: 5.7699,
    bid: 5.7599,
    broker: 'tickmill',
    swap_long: -150,
    swap_short: 40.5,
    symbol: 'USDBRL'
  },
  'EURUSD': {
    ask: 1.0835,
    bid: 1.0830,
    broker: 'tickmill',
    swap_long: -5.2,
    swap_short: 1.1,
    symbol: 'EURUSD'
  },
  'USDMXN': {
    ask: 16.7854,
    bid: 16.7654,
    broker: 'tickmill',
    swap_long: -180,
    swap_short: 35.5,
    symbol: 'USDMXN'
  }
};

router.get('/api/tickmill-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`[Tickmill] Fetching rate for ${symbol}...`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`http://3.145.164.47/symbol_info?broker=tickmill&symbol=${symbol}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Tickmill] Rate data:', data);
      res.json(data);
    } catch (fetchError) {
      console.error('[Tickmill] Fetch error:', fetchError);
      
      // Use fallback data when the API is unavailable
      if (FALLBACK_RATES[symbol]) {
        console.log('[Tickmill] Using fallback data for', symbol);
        return res.json(FALLBACK_RATES[symbol]);
      }
      
      res.status(500).json({ error: 'Failed to fetch rate from Tickmill API' });
    }
  } catch (error) {
    console.error('[Tickmill] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;