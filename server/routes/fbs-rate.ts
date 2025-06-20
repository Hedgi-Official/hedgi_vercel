import { Router } from 'express';
import fetch from 'node-fetch';
import { rateCache } from '../utils/rateCache';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/fbs-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`[FBS] Fetching rate for ${symbol}...`);
    
    try {
      const result = await rateCache.getRate('fbs', symbol, async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=fbs`;
        console.log(`[FBS] Making Flask request to: ${flaskUrl}`);
        
        const response = await fetch(flaskUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Hedgi-Replit/1.0',
            'Connection': 'keep-alive'
          }
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Non-JSON response received");
        }

        const data = await response.json();
        console.log('[FBS] Flask response:', data);
        
        return data;
      });

      res.json(result);
    } catch (fetchError) {
      console.error('[FBS] Fetch error:', fetchError);
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "fbs",
        symbol: symbol,
        error: "Failed to fetch rate from FBS API"
      });
    }
  } catch (error) {
    console.error('[FBS] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;