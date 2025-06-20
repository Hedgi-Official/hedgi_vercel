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
    const url = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=fbs`;
    console.log(`[FBS] Fetching: ${url}`);
    
    // Use the exact same approach as our working test
    const response = await fetch(url, {
      headers: { 'User-Agent': 'curl/8.11.1' }
    });
    
    console.log(`[FBS] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[FBS] Success! Data:`, data);
    
    res.json(data);
    
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