import { Router } from 'express';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];
const activeRequests = new Map();

// Retry with exponential backoff for Flask startup timing
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for valid data (not 0/0 fake quotes)
      if (data && data.bid > 0 && data.ask > 0) {
        return data;
      }
      
      if (attempt === maxRetries) {
        throw new Error('Flask returned invalid rates (0/0) - may need warm-up time');
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`[FBS] Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}

router.get('/api/fbs-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    // Prevent duplicate requests with UUID
    const requestId = randomUUID();
    const requestKey = `fbs-${symbol}`;
    
    if (activeRequests.has(requestKey)) {
      console.log(`[FBS] Duplicate request blocked for ${symbol}`);
      res.status(429).json({ error: 'Request in progress, please wait' });
      return;
    }
    
    activeRequests.set(requestKey, requestId);
    
    try {
      console.log(`[FBS] Fetching rate for ${symbol} (ID: ${requestId})`);
      
      // Ensure query parameters are properly encoded
      const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${encodeURIComponent(symbol)}&broker=fbs`;
      console.log(`[FBS] URL: ${flaskUrl}`);
      
      const data = await fetchWithRetry(flaskUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'curl/8.11.1',
          'X-Request-ID': requestId
        },
        // timeout: 10000 // Remove timeout as it's not supported by node-fetch
      });
      
      console.log(`[FBS] Success for ${symbol}: bid=${data.bid}, ask=${data.ask}`);
      res.json(data);
      
    } catch (fetchError) {
      console.error(`[FBS] Failed for ${symbol}:`, fetchError.message);
      res.json({
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker: "fbs",
        symbol: symbol,
        error: `Flask connection failed: ${fetchError.message}`
      });
    } finally {
      activeRequests.delete(requestKey);
    }
    
  } catch (error) {
    console.error('[FBS] Route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;