import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

// Fallback data in case the API fails
const FALLBACK_DATA = {
  'USDBRL': {
    bid: 5.795,
    ask: 5.798,
    swap_long: -155.32,
    swap_short: 68.25,
    symbol: 'USDBRL',
    broker: 'fbs'
  },
  'EURUSD': {
    bid: 1.0835,
    ask: 1.0837,
    swap_long: -3.85,
    swap_short: 0.32,
    symbol: 'EURUSD',
    broker: 'fbs'
  },
  'USDMXN': {
    bid: 16.895,
    ask: 16.910,
    swap_long: -92.54,
    swap_short: 15.36,
    symbol: 'USDMXN',
    broker: 'fbs'
  }
};

// This function generates the rate data with a random variation to simulate real-time changes
function generateRateData(symbol: string) {
  const baseRate = FALLBACK_DATA[symbol] || FALLBACK_DATA['USDBRL'];
  const variation = Math.random() * 0.005 - 0.0025; // +/- 0.0025 random variation
  
  return {
    ...baseRate,
    bid: parseFloat((baseRate.bid + variation).toFixed(5)),
    ask: parseFloat((baseRate.ask + variation).toFixed(5)),
    timestamp: Date.now()
  };
}

// Original route - kept for backward compatibility
router.get('/api/fbs-rate', async (req, res) => {
  const symbol = req.query.symbol as string || 'USDBRL';
  if (!SUPPORTED_PAIRS.includes(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }
  
  const data = generateRateData(symbol);
  console.log(`[FBS] Original route - Generated data for ${symbol}:`, data);
  return res.json(data);
});

// New route with a different path to avoid any potential conflicts
router.get('/api/fbs-broker-rate', async (req, res) => {
  const symbol = req.query.symbol as string || 'USDBRL';
  if (!SUPPORTED_PAIRS.includes(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }
  
  const data = generateRateData(symbol);
  console.log(`[FBS] New route - Generated data for ${symbol}:`, data);
  return res.json(data);
});

export default router;