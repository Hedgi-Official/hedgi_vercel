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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`http://3.145.164.47/symbol_info?broker=activtrades&symbol=${symbol}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ActivTrades] Rate data:', data);
      res.json(data);
    } catch (fetchError) {
      console.error('[ActivTrades] Fetch error:', fetchError);
      res.status(500).json({ error: 'Failed to fetch rate from ActivTrades API' });
    }
  } catch (error) {
    console.error('[ActivTrades] Error processing request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;