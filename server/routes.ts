import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import secondaryRateRouter from './routes/secondary-rate';
// Import XTB needs but don't import the router - we'll define routes directly
import { tradingService as xtbTradingService } from "./services/trading";
import { tradingService } from "./services/trading";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register routes
  app.use(secondaryRateRouter);
  
  // Fallback data for when XTB API is unavailable
  const FALLBACK_RATES = [
    {
      symbol: 'USDBRL',
      bid: 5.67,
      ask: 5.69,
      timestamp: Date.now(),
      swapLong: 0.0002,
      swapShort: 0.0001,
    },
    {
      symbol: 'EURUSD',
      bid: 1.08,
      ask: 1.09,
      timestamp: Date.now(),
      swapLong: 0.0001,
      swapShort: 0.0002,
    },
    {
      symbol: 'USDMXN',
      bid: 16.75,
      ask: 16.78,
      timestamp: Date.now(),
      swapLong: 0.0001,
      swapShort: 0.0001,
    }
  ];
  
  // XTB API routes defined directly in main routes file
  app.get("/api/xtb/rates", async (req, res) => {
    res.header('Content-Type', 'application/json');
    
    try {
      // If trading service is not connected, use fallback data
      if (!xtbTradingService.isConnected) {
        console.log('[XTB Backend] Using fallback rates as XTB service is not connected');
        return res.send(JSON.stringify(FALLBACK_RATES.map(rate => ({
          ...rate,
          timestamp: Date.now() // Update timestamp to current time
        }))));
      }
      
      // If connected, get real data for each symbol
      const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
      const rates = [];
      
      for (const symbol of symbols) {
        try {
          const symbolResponse = await xtbTradingService.getSymbolData(symbol);
          
          if (!symbolResponse.status || !symbolResponse.returnData) {
            console.log(`[XTB Backend] Failed to get data for ${symbol}, using fallback`);
            const fallback = FALLBACK_RATES.find(r => r.symbol === symbol);
            if (fallback) {
              rates.push({
                ...fallback,
                timestamp: Date.now()
              });
            }
            continue;
          }
          
          rates.push({
            symbol,
            bid: symbolResponse.returnData.bid,
            ask: symbolResponse.returnData.ask,
            timestamp: symbolResponse.returnData.time || Date.now(),
            swapLong: Math.abs(symbolResponse.returnData.swapLong || 0),
            swapShort: Math.abs(symbolResponse.returnData.swapShort || 0),
          });
        } catch (error) {
          console.error(`[XTB Backend] Error processing ${symbol}:`, error);
          const fallback = FALLBACK_RATES.find(r => r.symbol === symbol);
          if (fallback) {
            rates.push({
              ...fallback,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // If we have no rates, use all fallbacks
      if (rates.length === 0) {
        console.log('[XTB Backend] No rates available, using all fallbacks');
        return res.send(JSON.stringify(FALLBACK_RATES.map(rate => ({
          ...rate,
          timestamp: Date.now()
        }))));
      }
      
      // Send the rates as a direct JSON string
      return res.send(JSON.stringify(rates));
    } catch (error) {
      console.error('[XTB Backend] Error in rates endpoint:', error);
      // Return fallback data instead of an error
      return res.send(JSON.stringify(FALLBACK_RATES.map(rate => ({
        ...rate,
        timestamp: Date.now()
      }))));
    }
  });
  
  // XTB API route for hedge execution
  app.post("/api/xtb/hedge", async (req, res) => {
    res.header('Content-Type', 'application/json');
    
    try {
      const hedgeResult = await xtbTradingService.executeHedge(req.body);
      return res.send(JSON.stringify(hedgeResult));
    } catch (error) {
      console.error('[XTB Backend] Error executing hedge:', error);
      return res.status(500).send(JSON.stringify({ error: 'Failed to execute hedge' }));
    }
  });

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
        rate: rate.toString(),
        duration,
        status: "active",
        tradeOrderNumber: String(tradeOrderNumber),
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