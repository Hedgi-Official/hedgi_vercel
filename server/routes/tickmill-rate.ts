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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced timeout
      
      const response = await fetch(`https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?broker=tickmill&symbol=${symbol}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log('[Tickmill] Rate data:', data);
        
        // Check if the data contains valid rates (non-zero bid/ask)
        if (data.bid > 0 && data.ask > 0) {
          res.json(data);
        } else {
          // Flask responded but rates are zero - return structured response
          res.json({
            ...data,
            error: "Tickmill rates currently unavailable (bid/ask = 0)"
          });
        }
      } else {
        console.log("[Tickmill] Received non-JSON response. Returning fallback response.");
        res.json({
          bid: 0,
          ask: 0,
          swap_long: 0,
          swap_short: 0,
          broker: "tickmill",
          symbol: symbol,
          error: "Tickmill rate API unavailable due to service issue"
        });
      }
    } catch (fetchError) {
      console.error('[Tickmill] Fetch error:', fetchError);
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "tickmill",
        symbol: symbol,
        error: "Failed to fetch rate from Tickmill API"
      });
    }
  } catch (error) {
    console.error('[Tickmill] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;