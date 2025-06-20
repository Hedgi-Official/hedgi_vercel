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

    console.log(`[FBS] Fetching rate for ${symbol}...`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=fbs`;
      console.log(`[FBS] Fetching from: ${flaskUrl}`);
      
      const response = await fetch(flaskUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Hedgi-Replit/1.0'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log('[FBS] Rate data:', data);
        
        // Check if the data contains valid rates (non-zero bid/ask)
        if (data.bid > 0 && data.ask > 0) {
          res.json(data);
        } else {
          // Flask responded but rates are zero - return structured response
          res.json({
            ...data,
            error: "FBS rates currently unavailable (bid/ask = 0)"
          });
        }
      } else {
        console.log("Received HTML instead of JSON. Returning fallback response.");
        // Return a structured error that can be handled by the client
        res.json({
          bid: 0,
          ask: 0,
          swap_long: 0,
          swap_short: 0,
          broker: "fbs",
          symbol: symbol,
          error: "FBS rate API unavailable due to API key or service issue"
        });
      }
    } catch (fetchError) {
      console.error('[FBS] Fetch error:', fetchError);
      res.status(500).json({ error: 'Failed to fetch rate from FBS API' });
    }
  } catch (error) {
    console.error('[FBS] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;