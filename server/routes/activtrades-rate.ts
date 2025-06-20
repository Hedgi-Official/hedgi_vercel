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
      const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=activetrades`;
      console.log(`[ActivTrades] Making request to: ${flaskUrl}`);
      
      const startTime = Date.now();
      const response = await fetch(flaskUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'curl/8.11.1'
        }
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`[ActivTrades] Response received in ${elapsed}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ActivTrades] HTTP error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[ActivTrades] Response data:', JSON.stringify(data, null, 2));
      
      res.json(data);
      
    } catch (fetchError) {
      console.error('[ActivTrades] Error details:', {
        message: fetchError.message,
        stack: fetchError.stack,
        name: fetchError.name
      });
      
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "activtrades",
        symbol: symbol,
        error: `Connection failed: ${fetchError.message}`
      });
    }
  } catch (error) {
    console.error('[ActivTrades] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;