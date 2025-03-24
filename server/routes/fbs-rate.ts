import { Router } from "express";
import { log } from "../vite";

const router = Router();

// Sample rates for different currency pairs - these closely match the other brokers' rates
const FBS_RATES: Record<string, any> = {
  "USDBRL": {
    bid: 5.793,
    ask: 5.797,
    broker: 'fbs',
    swap_long: -155.32,
    swap_short: 68.25,
    symbol: 'USDBRL'
  },
  "EURUSD": {
    bid: 1.0832,
    ask: 1.0837,
    broker: 'fbs',
    swap_long: -3.85,
    swap_short: 0.32,
    symbol: 'EURUSD'
  },
  "USDMXN": {
    bid: 16.893,
    ask: 16.912,
    broker: 'fbs',
    swap_long: -92.54,
    swap_short: 15.36,
    symbol: 'USDMXN'
  }
};

router.get("/api/fbs-rate", async (req, res) => {
  const symbol = (req.query.symbol as string) || "USDBRL";
  
  try {
    console.log(`[FBS] Fetching rate for ${symbol}...`);
    
    // Get rates for the requested symbol
    const rateData = FBS_RATES[symbol] || FBS_RATES["USDBRL"];
    
    // Add small random variation to simulate real-time changes
    const variation = Math.random() * 0.005 - 0.0025; // +/- 0.0025 random variation
    const data = {
      ...rateData,
      bid: parseFloat((rateData.bid + variation).toFixed(5)),
      ask: parseFloat((rateData.ask + variation).toFixed(5)),
      timestamp: Date.now()
    };
    
    console.log("[FBS] Rate data:", data);
    return res.json(data);
  } catch (error: any) {
    console.error("[FBS] Error in rate handler:", error.message);
    // Return a fallback rate if anything goes wrong
    const fallbackRate = FBS_RATES[symbol] || FBS_RATES["USDBRL"];
    res.json({
      ...fallbackRate,
      timestamp: Date.now()
    });
  }
});

export default router;