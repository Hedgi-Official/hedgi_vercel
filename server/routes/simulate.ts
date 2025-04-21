import { Router, Request, Response } from "express";
import fetch from "node-fetch";

// Define the type for the exchange rate API response
interface ExchangeRateResponse {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  rates: {
    [currencyCode: string]: number;
  };
}

const router = Router();

/**
 * Simulate endpoint to quote any 3-letter ISO currency pair
 * @route GET /api/simulate
 * @query {string} base - Base currency code (e.g., USD)
 * @query {string} target - Target currency code (e.g., BRL)
 * @query {string} amount - Amount to convert
 * @returns {object} - Returns hedgeCost details
 */
router.get("/api/simulate", async (req: Request, res: Response) => {
  const { base, target, amount } = req.query;
  
  // Validate required parameters
  if (
    typeof base !== 'string' ||
    typeof target !== 'string' ||
    typeof amount !== 'string'
  ) {
    return res.status(400).json({ error: 'Missing or invalid parameters' });
  }

  // Normalize currency codes (uppercase)
  const b = base.toUpperCase();
  const t = target.toUpperCase();
  const amt = Number(amount);
  
  // Validate amount
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Fetch FX rate from open.er-api.com
    const fxRes = await fetch(`https://open.er-api.com/v6/latest/${b}`);
    
    if (!fxRes.ok) {
      throw new Error(`FX lookup failed: ${fxRes.status}`);
    }
    
    const fxData = await fxRes.json() as ExchangeRateResponse;
    
    // Check if response is successful and target currency exists in rates
    if (fxData.result !== 'success' || !fxData.rates[t]) {
      throw new Error(`Exchange rate not available for ${b} to ${t}`);
    }
    
    const rate = Number(fxData.rates[t]);

    // Calculate hedgeCost (0.25% of delivered amount)
    const delivered = amt * rate;
    const hedgeCost = Number((delivered * 0.0025).toFixed(2));

    // Return the formatted response
    return res.status(200).json({
      costDetails: {
        hedgeCost,
        rate,
        timestamp: Date.now(),
      },
    });
  } catch (err: any) {
    console.error('Simulate error', b, t, err);
    return res
      .status(500)
      .json({ error: err.message || 'Simulation service error' });
  }
});

export default router;