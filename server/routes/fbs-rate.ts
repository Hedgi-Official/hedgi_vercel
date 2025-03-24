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

    const data = await response.json();
    console.log(`[FBS] Rate data:`, data);
    
    return res.json(data);
  } catch (error: any) {
    console.error(`[FBS] Error fetching rate:`, error);
    return res.status(500).json({ 
      error: "Failed to fetch FBS rate", 
      message: error.message 
    });
  }
});

export default router;