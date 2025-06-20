import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/activtrades-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`[ActivTrades] Fetching rate for ${symbol}...`);
    
    try {
      // Use exact same format as your working curl command
      const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=activetrades`;
      console.log(`[ActivTrades] Fetching from: ${flaskUrl}`);
      
      const response = await fetch(flaskUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'curl/8.11.1'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ActivTrades] Rate data:', data);
      res.json(data);
      
    } catch (fetchError) {
      console.error('[ActivTrades] Fetch error:', fetchError);
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "activtrades",
        symbol: symbol,
        error: "Failed to fetch rate from ActivTrades API"
      });
    }
  } catch (error) {
    console.error('[ActivTrades] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;