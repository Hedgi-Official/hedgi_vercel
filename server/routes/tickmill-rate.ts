import { Router } from 'express';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/tickmill-rate', async (req, res) => {
  const symbol = req.query.symbol as string;

  if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
    return res.status(400).json({ error: 'Invalid or missing symbol parameter' });
  }

  console.log(`[Tickmill] Processing request for ${symbol}`);

  try {
    const url = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=tickmill`;
    console.log(`[Tickmill] Fetching: ${url}`);
    
    // Use the exact same approach as our working test
    const response = await fetch(url, {
      headers: { 'User-Agent': 'curl/8.11.1' }
    });
    
    console.log(`[Tickmill] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[Tickmill] Success! Data:`, data);
    
    res.json(data);
    
  } catch (error) {
    console.error(`[Tickmill] Error:`, error.message);
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
});

export default router;