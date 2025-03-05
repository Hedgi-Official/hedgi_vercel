import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import secondaryRateRouter from './routes/secondary-rate';
import { tradingService } from "./services/trading";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register secondary rate route
  app.use(secondaryRateRouter);

  app.get("/api/hedges", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userHedges = await db.query.hedges.findMany({
      where: eq(hedges.userId, req.user.id),
      orderBy: desc(hedges.createdAt),
    });

    res.json(userHedges);
  });

  // New endpoint to check trade status
  app.get("/api/hedges/status/:tradeOrderNumber", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const tradeOrderNumber = parseInt(req.params.tradeOrderNumber);
    if (isNaN(tradeOrderNumber)) {
      return res.status(400).send("Invalid trade order number");
    }

    try {
      const statusResponse = await tradingService.checkTradeStatus(tradeOrderNumber);

      // Log the entire statusResponse for debugging purposes.
      console.log(`[Routes] Trade status response for order ${tradeOrderNumber}:`, statusResponse);

      // If you want to check specifically if the "status" property is undefined:
      if (!statusResponse || typeof statusResponse.status === 'undefined') {
        console.error(`Trade status for order ${tradeOrderNumber} is missing the "status" property:`, statusResponse);
      }

      res.json(statusResponse);
    } catch (error) {
      console.error('Error checking trade status:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check trade status" });
    }
  });


  app.post("/api/hedges", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { baseCurrency, targetCurrency, amount, rate, duration, tradeDirection } = req.body;

    try {
      // Convert amount to number, apply direction, then back to string
      const adjustedAmount = (tradeDirection === 'sell' ? 
        -Math.abs(Number(amount)) : 
        Math.abs(Number(amount))).toString();

      // Open trade via XTB API
      // XTB requires the symbol in format where the first currency is the base
      // and the second is the counter (quote) currency
      const symbol = `${targetCurrency}${baseCurrency}`;

      // Convert amount to standard lots (1 lot = 100,000 units) but let trading service handle currency-specific adjustments
      // Don't divide here, as the trading service will adjust based on currency pair
      const volume = Math.abs(Number(amount)); 

      // Trade direction needs to be mapped correctly from UI to XTB API
      // If user wants to "buy USD" with BRL as base, then we're buying USDBRL
      const isBuy = tradeDirection === 'buy';

      console.log(`Opening trade: ${symbol}, Volume: ${volume}, Direction: ${isBuy ? 'BUY' : 'SELL'}`);

      // Get the current price from XTB API
      const symbolData = await tradingService.getSymbolData(symbol);
      
      // Log the actual API response from XTB (remove any mock formatting)
      console.log(`[Routes] Symbol data for ${symbol}:`, symbolData);

      // Use the appropriate price based on trade direction (ask for buy, bid for sell)
      const currentPrice = isBuy ? 
        (symbolData?.status && symbolData?.returnData ? symbolData.returnData.ask : null) : 
        (symbolData?.status && symbolData?.returnData ? symbolData.returnData.bid : null);

      console.log(`[Routes] Using ${isBuy ? 'ask' : 'bid'} price for ${symbol}: ${currentPrice}`);

      // Open the trade and get the order number
      const tradeOrderNumber = await tradingService.openTrade(
        symbol,
        currentPrice, // Always use a valid price, not 0
        volume,
        isBuy,
        0, // sl
        0, // tp
        `Hedge position for ${symbol}`
      );

      // Verify transaction was successful by checking the status
      if (tradeOrderNumber <= 0) {
        throw new Error(`Failed to open trade for ${symbol}`);
      }

      // Record the trade in the database
      const [hedge] = await db.insert(hedges).values({
        userId: req.user.id,
        baseCurrency,
        targetCurrency,
        amount: adjustedAmount,
        rate: parseFloat(rate),
        duration,
        status: "active",
        tradeOrderNumber: tradeOrderNumber,
        tradeStatus: "ACTIVE", // Assuming 'ACTIVE' upon successful trade opening.
      }).returning();

      res.json(hedge);
    } catch (error) {
      console.error('Error creating hedge:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create hedge" });
    }
  });

  app.delete("/api/hedges/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const hedgeId = parseInt(req.params.id);
    if (isNaN(hedgeId)) {
      return res.status(400).send("Invalid hedge ID");
    }

    try {
      // Get the hedge details first
      const [hedge] = await db
        .select()
        .from(hedges)
        .where(eq(hedges.id, hedgeId));

      if (!hedge) {
        return res.status(404).send("Hedge not found");
      }

      // Close the trade via XTB API
      if (hedge.tradeOrderNumber) {
        const symbol = `${hedge.targetCurrency}${hedge.baseCurrency}`;
        const volume = Math.abs(Number(hedge.amount));
        const isBuy = Number(hedge.amount) > 0;

        // Get the current price from XTB API
        const symbolData = await tradingService.getSymbolData(symbol);
        
        // Log the actual API response for debugging (without mock formatting)
        console.log(`[Routes] Symbol data for ${symbol} (closing):`, symbolData);

        // Use the appropriate price based on trade direction (ask for buy, bid for sell)
        const currentPrice = isBuy ? 
          (symbolData?.status && symbolData?.returnData ? symbolData.returnData.ask : null) : 
          (symbolData?.status && symbolData?.returnData ? symbolData.returnData.bid : null);

        console.log(`[Routes] Using ${isBuy ? 'ask' : 'bid'} price for closing ${symbol}: ${currentPrice}`);

        // Close the trade and verify its status
        const closingOrderNumber = await tradingService.closeTrade(
          symbol,
          hedge.tradeOrderNumber,
          currentPrice || 0, // Use current market price if available
          volume,
          isBuy,
          0, // sl
          0, // tp
          `Closing hedge position for ${symbol}` // comment
        );

        console.log(`[Routes] Successfully closed trade ${hedge.tradeOrderNumber} with closing order ${closingOrderNumber}`);
      }

      // Delete the hedge from database
      const [deletedHedge] = await db
        .delete(hedges)
        .where(eq(hedges.id, hedgeId))
        .returning();

      res.json({ message: "Hedge deleted successfully" });
    } catch (error) {
      console.error('Error deleting hedge:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete hedge" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}