import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/fbs-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`[FBS] Called at ${Date.now()} for ${symbol}`);
    
    try {
      const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=fbs`;
      console.log(`[FBS] Full URL: ${flaskUrl}`);
      
      const startTime = Date.now();
      const response = await fetch(flaskUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'curl/8.11.1'
        }
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`[FBS] Response: ${response.status} in ${elapsed}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FBS] HTTP error:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[FBS] Data received:', data);
      
      // Validate data structure before sending
      if (data && typeof data === 'object' && 'bid' in data && 'ask' in data) {
        res.json(data);
      } else {
        console.error('[FBS] Invalid data structure:', data);
        throw new Error('Invalid response format from Flask');
      }
      
    } catch (fetchError) {
      console.error('[FBS] Fetch failed:', fetchError.message);
      
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "fbs",
        symbol: symbol,
        error: `Failed to fetch rate from FBS API`
      });
    }
  } catch (error) {
    console.error('[FBS] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;