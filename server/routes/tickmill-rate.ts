import express from 'express';
import { Router } from 'express';

const router = Router();

// Define type for rate data
interface RateData {
  symbol: string;
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
  broker: string;
}

// Define type for rates dictionary
interface RatesCollection {
  [key: string]: RateData;
}

// Sample rate data for Tickmill broker
const rateData: RatesCollection = {
  USDBRL: {
    symbol: 'USDBRL',
    bid: 5.6945,
    ask: 5.7045,
    swap_long: -180,
    swap_short: 48.5,
    broker: 'tickmill'
  },
  EURUSD: {
    symbol: 'EURUSD',
    bid: 1.0868,
    ask: 1.0878,
    swap_long: -12.5,
    swap_short: 2.8,
    broker: 'tickmill'
  },
  USDMXN: {
    symbol: 'USDMXN',
    bid: 16.7823,
    ask: 16.8123,
    swap_long: -135,
    swap_short: 65.2,
    broker: 'tickmill'
  }
};

// List of supported currency pairs
const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

// Add small random fluctuations to make rates appear live
function getRandomFluctuation(baseValue: number): number {
  // Random fluctuation between -0.1% and +0.1%
  const fluctuationPercentage = (Math.random() * 0.002) - 0.001;
  return baseValue * (1 + fluctuationPercentage);
}

router.get('/api/tickmill-rate', (req, res) => {
  const symbol = req.query.symbol as string;
  
  if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
    return res.status(400).json({ error: 'Invalid or missing symbol parameter' });
  }

  if (!rateData[symbol]) {
    return res.status(404).json({ error: `Rate for symbol ${symbol} not found` });
  }

  console.log(`[Tickmill] Fetching rate for ${symbol}...`);

  // Apply random fluctuations to create "live" feel
  const baseRate = rateData[symbol];
  const liveRate = {
    ...baseRate,
    bid: parseFloat(getRandomFluctuation(baseRate.bid).toFixed(5)),
    ask: parseFloat(getRandomFluctuation(baseRate.ask).toFixed(5))
  };

  console.log('[Tickmill] Rate data:', liveRate);

  // Add a small delay (50-200ms) to simulate real API call
  setTimeout(() => {
    res.json(liveRate);
  }, Math.random() * 150 + 50);
});

export default router;