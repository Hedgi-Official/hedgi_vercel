import { Router } from "express";
import fetch from "node-fetch";
import { log } from "../vite";

const router = Router();

router.get("/api/fbs-rate", async (req, res) => {
  const symbol = req.query.symbol || "USDBRL";
  
  try {
    console.log(`[FBS] Fetching rate for ${symbol}...`);
    const response = await fetch(`http://3.145.164.47/symbol_info?broker=fbs&symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`FBS API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log("[FBS] Rate data:", data);
    
    return res.json(data);
  } catch (error: any) {
    console.error("[FBS] Error fetching rate:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;