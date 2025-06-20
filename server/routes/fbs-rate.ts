import { Router } from 'express';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/fbs-rate', async (req, res) => {
  const symbol = req.query.symbol as string;

  if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
    return res.status(400).json({ error: 'Invalid or missing symbol parameter' });
  }

  console.log(`[FBS] Processing request for ${symbol}`);

  try {
    // Use Node.js built-in fetch (available in Node 18+)
    const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=fbs`;
    console.log(`[FBS] Calling Flask: ${flaskUrl}`);

    const response = await fetch(flaskUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'curl/8.11.1'
      }
    });

    console.log(`[FBS] Flask response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Flask returned HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`[FBS] Flask data:`, data);

    // Validate the response structure
    if (data && typeof data.bid === 'number' && typeof data.ask === 'number') {
      console.log(`[FBS] Returning valid data: bid=${data.bid}, ask=${data.ask}`);
      res.json(data);
    } else {
      console.log(`[FBS] Invalid data structure received:`, data);
      throw new Error('Invalid response format from Flask');
    }

  } catch (error) {
    console.error(`[FBS] Error:`, error.message);
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
});

export default router;