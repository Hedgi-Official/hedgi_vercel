import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];
const SUPPORTED_BROKERS = ['activetrades', 'tickmill', 'fbs'];

// Unified rate endpoint that works with your Flask queue system
router.get('/api/rates/:broker', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    const broker = req.params.broker;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      return res.status(400).json({ error: 'Invalid or missing symbol parameter' });
    }

    if (!broker || !SUPPORTED_BROKERS.includes(broker)) {
      return res.status(400).json({ error: 'Invalid or missing broker parameter' });
    }

    console.log(`[${broker.toUpperCase()}] Fetching rate for ${symbol}...`);
    
    const flaskUrl = `https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=${symbol}&broker=${broker}`;
    console.log(`[${broker.toUpperCase()}] Making request to: ${flaskUrl}`);
    
    const startTime = Date.now();
    const response = await fetch(flaskUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'curl/8.11.1'
      }
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[${broker.toUpperCase()}] Response received in ${elapsed}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${broker.toUpperCase()}] HTTP error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[${broker.toUpperCase()}] Response data:`, JSON.stringify(data, null, 2));
    
    res.json(data);
    
  } catch (fetchError) {
    console.error(`[${req.params.broker?.toUpperCase() || 'UNKNOWN'}] Error details:`, {
      message: fetchError.message,
      stack: fetchError.stack,
      name: fetchError.name
    });
    
    res.json({
      bid: 0,
      ask: 0,
      swap_long: 0,
      swap_short: 0,
      broker: req.params.broker || 'unknown',
      symbol: req.query.symbol as string || 'unknown',
      error: `Connection failed: ${fetchError.message}`
    });
  }
});

export default router;