import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/tickmill-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`[Tickmill] Called at ${Date.now()} for ${symbol}`);
    
    try {
      const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=tickmill`;
      console.log(`[Tickmill] Full URL: ${flaskUrl}`);
      
      const startTime = Date.now();
      const response = await fetch(flaskUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'curl/8.11.1'
        }
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`[Tickmill] Response: ${response.status} in ${elapsed}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Tickmill] HTTP error:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Tickmill] Data received:', data);
      
      // Validate data structure before sending
      if (data && typeof data === 'object' && 'bid' in data && 'ask' in data) {
        res.json(data);
      } else {
        console.error('[Tickmill] Invalid data structure:', data);
        throw new Error('Invalid response format from Flask');
      }
      
    } catch (fetchError) {
      console.error('[Tickmill] Fetch failed:', fetchError.message);
      
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "tickmill",
        symbol: symbol,
        error: `Failed to fetch rate from Tickmill API`
      });
    }
  } catch (error) {
    console.error('[Tickmill] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;