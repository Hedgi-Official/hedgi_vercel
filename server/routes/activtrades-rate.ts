import { Router } from 'express';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/activtrades-rate', async (req, res) => {
  const symbol = req.query.symbol as string;

  if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
    return res.status(400).json({ error: 'Invalid or missing symbol parameter' });
  }

  console.log(`[ActivTrades] Processing request for ${symbol}`);

  try {
    // Use Node.js built-in fetch (available in Node 18+)
    const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=activetrades`;
    console.log(`[ActivTrades] Calling Flask: ${flaskUrl}`);

    const response = await fetch(flaskUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'curl/8.11.1'
      }
    });

    console.log(`[ActivTrades] Flask response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Flask returned HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`[ActivTrades] Flask data:`, data);

    // Validate the response structure
    if (data && typeof data.bid === 'number' && typeof data.ask === 'number') {
      console.log(`[ActivTrades] Returning valid data: bid=${data.bid}, ask=${data.ask}`);
      res.json(data);
    } else {
      console.log(`[ActivTrades] Invalid data structure received:`, data);
      throw new Error('Invalid response format from Flask');
    }

  } catch (error) {
    console.error(`[ActivTrades] Error:`, error.message);
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
});

export default router;