import { Router, Request, Response } from "express";
import fetch from "node-fetch";

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
    // Fetch FX rate from exchangerate.host API
    const fxRes = await fetch(
      `https://api.exchangerate.host/convert?from=${b}&to=${t}`
    );
    
    if (!fxRes.ok) {
      throw new Error(`FX lookup failed: ${fxRes.status}`);
    }
    
    const fxData = await fxRes.json();
    const rate = fxData.result as number;

    if (!rate) {
      throw new Error('Invalid exchange rate received');
    }

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