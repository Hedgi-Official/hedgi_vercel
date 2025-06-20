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

    console.log(`[Tickmill] Fetching rate for ${symbol}...`);
    
    try {
      // Flask uses queue system with 5s timeout - give it more time
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for Flask queue
      
      const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=tickmill`;
      console.log(`[Tickmill] Fetching from Flask queue system: ${flaskUrl}`);
      
      const response = await fetch(flaskUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'curl/8.11.1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Tickmill] Flask HTTP error ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Tickmill] Flask queue response:', data);
      
      // Check if Flask returned an error from the queue system
      if (data.error) {
        console.error('[Tickmill] Flask queue error:', data.error);
        res.json({
          bid: 0,
          ask: 0,
          swap_long: 0,
          swap_short: 0,
          broker: "tickmill",
          symbol: symbol,
          error: `Flask queue error: ${data.error}`
        });
      } else {
        res.json(data);
      }
      
    } catch (fetchError) {
      console.error('[Tickmill] Fetch error:', fetchError.message);
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "tickmill",
        symbol: symbol,
        error: `Failed to fetch rate from Tickmill API: ${fetchError.message}`
      });
    }
  } catch (error) {
    console.error('[Tickmill] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;