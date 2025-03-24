import { Request, Response, Router } from "express";
import fetch from "node-fetch";

const router = Router();

router.get("/api/fbs-rate", async (req: Request, res: Response) => {
  const symbol = req.query.symbol || "USDBRL";
  console.log(`[FBS] Fetching rate for ${symbol}...`);

  try {
    const response = await fetch(`http://3.145.164.47/symbol_info?broker=fbs&symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log(`[FBS] Rate data:`, data);
      return res.json(data);
    } else {
      console.log("Received HTML instead of JSON. Returning fallback response.");
      // Return a structured error that can be handled by the client
      return res.json({
        bid: 0,
        ask: 0,
        price: 0,
        broker: "fbs",
        symbol: symbol,
        error: "FBS rate API unavailable due to invalid API key or service issue"
      });
    }
  } catch (error: any) {
    console.error(`[FBS] Error fetching rate:`, error);
    return res.status(200).json({ 
      bid: 0,
      ask: 0,
      price: 0,
      broker: "fbs",
      symbol: symbol,
      error: "FBS rate API unavailable",
      message: error.message 
    });
  }
});

export default router;