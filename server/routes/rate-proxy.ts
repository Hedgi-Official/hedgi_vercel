import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Simple proxy that exactly mimics the working Node.js test
router.get('/api/rate-proxy', async (req, res) => {
  const symbol = req.query.symbol as string;
  const broker = req.query.broker as string;
  
  if (!symbol || !broker) {
    return res.status(400).json({ error: 'Missing symbol or broker parameter' });
  }
  
  const timestamp = Date.now();
  console.log(`[RateProxy] ${timestamp} - ${broker}/${symbol}`);
  
  try {
    const url = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=${broker}`;
    console.log(`[RateProxy] URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'curl/8.11.1'
      }
    });
    
    console.log(`[RateProxy] Status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[RateProxy] Success:`, data);
    
    res.json(data);
    
  } catch (error) {
    console.error(`[RateProxy] Error:`, error.message);
    res.json({
      bid: 0,
      ask: 0,
      swap_long: 0,
      swap_short: 0,
      broker,
      symbol,
      error: `Failed to fetch rate from ${broker} API`
    });
  }
});

export default router;