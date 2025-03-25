import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import secondaryRateRouter from './routes/secondary-rate';
import chatRouter from './routes/chat';
import activtradesRouter from './routes/activtrades-rate';
import tickmillRouter from './routes/tickmill-rate';
import fbsRouter from './routes/fbs-rate';
// Import our modern trade service for the curl-based API implementation
import { tradeService } from "./services/tradeService";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register routes
  app.use(secondaryRateRouter);
  app.use(chatRouter);
  app.use(activtradesRouter);
  app.use(tickmillRouter);
  app.use(fbsRouter);
  // app.use(xtbRouter); // Removed - we're using direct routes below

  // List of supported symbols for exchange rates
  const SUPPORTED_SYMBOLS = ['USDBRL', 'EURUSD', 'USDMXN'];

  // Exchange rates endpoint that uses our new infrastructure
  app.get("/api/xtb/rates", async (req, res) => {
    res.header('Content-Type', 'application/json');
    console.log('[Exchange Rates DEBUG] Request received for /api/xtb/rates');

    try {
      // Get real data for each symbol using our activtrades endpoint
      const symbols = SUPPORTED_SYMBOLS;
      const rates = [];
      
      console.log('[Exchange Rates DEBUG] Fetching rates for all symbols:', symbols);

      for (const symbol of symbols) {
        try {
          console.log(`[Exchange Rates] Fetching rate for ${symbol}`);
          // Use fetch with a timeout for safety
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          // Fetch from the activtrades endpoint which returns real data
          const response = await fetch(`http://localhost:${req.socket.localPort}/api/activtrades-rate?symbol=${symbol}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log(`[Exchange Rates] Got data for ${symbol}:`, data);
          
          rates.push({
            symbol,
            bid: data.bid,
            ask: data.ask,
            timestamp: Date.now(),
            swapLong: Math.abs(data.swap_long / 10000 || 0), // Convert to decimal
            swapShort: Math.abs(data.swap_short / 10000 || 0), // Convert to decimal
          });
        } catch (error) {
          console.error(`[Exchange Rates] Error fetching ${symbol}:`, error);
          
          // If a specific symbol fails, let's still return the others
          // rather than failing the whole request
          continue;
        }
      }

      // If we have no rates, something went wrong with the service
      if (rates.length === 0) {
        console.error('[Exchange Rates] Failed to get any rates');
        return res.status(503).json({ 
          error: 'Exchange rate service temporarily unavailable' 
        });
      }

      // Send the rates as a direct JSON string
      console.log('[Exchange Rates] Returning rates:', rates);
      return res.send(JSON.stringify(rates));
    } catch (error) {
      console.error('[Exchange Rates] Error in rates endpoint:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve exchange rates'
      });
    }
  });

  // Broker API route for hedge execution - Now using our new Trade API
  app.post("/api/xtb/hedge", async (req, res) => {
    res.header('Content-Type', 'application/json');
    const requestId = Date.now().toString();

    try {
      console.log(`[Trade API][${requestId}] Processing hedge request`);
      
      // Format the trade request with proper validation
      const { amount, baseCurrency, targetCurrency, tradeDirection } = req.body;
      
      if (!amount || !baseCurrency || !targetCurrency || !tradeDirection) {
        return res.status(400).json({ 
          status: false,
          error: 'Missing required fields'
        });
      }
      
      const volume = Math.abs(Number(amount)) / 100000;
      if (isNaN(volume) || volume <= 0) {
        return res.status(400).json({ 
          status: false,
          error: 'Invalid amount' 
        });
      }
      
      const symbol = `${targetCurrency}${baseCurrency}`;
      console.log(`[Trade API][${requestId}] Placing ${tradeDirection} order for ${volume} lots of ${symbol}`);

      // Use our new trade service with the broker "activtrades"
      const apiResponse = await tradeService.openTrade(
        'activtrades', // Default broker as specified in requirements
        symbol,
        tradeDirection as 'buy' | 'sell',
        volume,
        `Hedgi-${requestId}-${baseCurrency}${targetCurrency}`
      );
      
      console.log(`[Trade API][${requestId}] Trade response:`, apiResponse);

      // Ensure we have a valid order number
      const tradeOrderNumber = apiResponse.order;
      if (!tradeOrderNumber) {
        throw new Error('No valid order number returned from Trade API');
      }

      // Return the confirmed response with order number
      return res.json({
        status: true,
        returnData: {
          order: tradeOrderNumber,
          price: apiResponse.price
        }
      });
    } catch (error) {
      console.error(`[Trade API][${requestId}] Error executing hedge:`, error);
      return res.status(500).json({ 
        status: false,
        error: error instanceof Error ? error.message : String(error)
      });
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

  // Optimized endpoint to check trade status (simplified for now as our new API doesn't have a specific status check)
  app.get("/api/hedges/status/:tradeOrderNumber", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const tradeOrderNumber = parseInt(req.params.tradeOrderNumber);
    if (isNaN(tradeOrderNumber)) {
      return res.status(400).send("Invalid trade order number");
    }

    try {
      // With the new API, we don't have a direct way to check trade status
      // So we'll just return a success response that the trade order exists in our database
      // In a real implementation, you might want to add a status check endpoint to your API
      
      // Find the hedge in our database with this trade order number
      const hedge = await db.query.hedges.findFirst({
        where: eq(hedges.tradeOrderNumber, tradeOrderNumber)
      });
      
      if (!hedge) {
        return res.json({ 
          status: true, 
          found: false, 
          message: `Trade with order number ${tradeOrderNumber} not found in database` 
        });
      }

      // Return a simplified trade object based on our database record
      res.json({
        status: true,
        found: true,
        trade: {
          order: hedge.tradeOrderNumber,
          symbol: `${hedge.targetCurrency}${hedge.baseCurrency}`,
          amount: hedge.amount,
          type: Number(hedge.amount) > 0 ? 'buy' : 'sell',
          price: Number(hedge.rate),
          status: hedge.status
        }
      });
    } catch (error) {
      console.error('Error checking trade status:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check trade status" });
    }
  });


  app.post("/api/hedges", async (req, res) => {
    // Enhanced logging throughout the entire process
    const requestId = Date.now().toString();
    console.log(`[DEBUG][${requestId}] POST /api/hedges request received:`, {
      headers: req.headers,
      body: req.body,
      auth: req.isAuthenticated()
    });
    
    if (!req.isAuthenticated()) {
      console.log(`[DEBUG][${requestId}] Request rejected: Not authenticated`);
      return res.status(401).send("Not authenticated");
    }

    try {
      console.log(`[Trade API][${requestId}] Processing hedge request from /api/hedges`);
      
      // Parse and validate request data
      const { amount, baseCurrency, targetCurrency, tradeDirection, duration } = req.body;
      
      console.log(`[DEBUG][${requestId}] Request data:`, { 
        amount, baseCurrency, targetCurrency, tradeDirection, duration 
      });
      
      if (!amount || !baseCurrency || !targetCurrency || !tradeDirection) {
        console.log(`[DEBUG][${requestId}] Missing required fields`);
        return res.status(400).json({ 
          status: false,
          error: 'Missing required fields' 
        });
      }
      
      const volume = Math.abs(Number(amount)) / 100000;
      if (isNaN(volume) || volume <= 0) {
        console.log(`[DEBUG][${requestId}] Invalid amount: ${amount}, calculated volume: ${volume}`);
        return res.status(400).json({ 
          status: false,
          error: 'Invalid amount' 
        });
      }
      
      const symbol = `${targetCurrency}${baseCurrency}`;
      console.log(`[Trade API][${requestId}] Placing ${tradeDirection} order for ${volume} lots of ${symbol}`);

      // Enhanced trade execution with detailed logging
      try {
        // Use the new trade service with the broker "activtrades"
        const apiResponse = await tradeService.openTrade(
          'activtrades', // Default broker as specified in requirements
          symbol,
          tradeDirection as 'buy' | 'sell',
          volume,
          `Hedgi-${requestId}-${baseCurrency}${targetCurrency}-${duration}days`
        );
        
        console.log(`[DEBUG][${requestId}] Trade API response:`, JSON.stringify(apiResponse));

        // Extract the order number from response with validation
        const tradeOrderNumber = apiResponse.order;
        console.log(`[DEBUG][${requestId}] Trade order number:`, tradeOrderNumber);
        
        if (!tradeOrderNumber) {
          throw new Error('No valid order number returned from Trade API');
        }

        // Create and log the exact hedge data to be stored
        const hedgeValues = {
          baseCurrency: baseCurrency,
          targetCurrency: targetCurrency,
          amount: String(volume * 100000 * (tradeDirection === 'buy' ? 1 : -1)),
          rate: apiResponse.price?.toString() || "0.0",
          duration: duration || 30,
          status: 'active',
          tradeOrderNumber: tradeOrderNumber,
          tradeStatus: 'open'
        };
        
        console.log(`[DEBUG][${requestId}] Hedge values to insert:`, hedgeValues);
        
        // Insert with userId, ensuring proper type handling
        const newHedge = await db.insert(hedges)
          .values({
            ...hedgeValues,
            userId: req.user.id
          })
          .returning();

        console.log(`[DEBUG][${requestId}] Database insert result:`, newHedge);
        
        // Return a successful response with all needed data
        const response = {
          status: true,
          returnData: {
            order: tradeOrderNumber,
            price: apiResponse.price
          },
          hedgeId: newHedge[0]?.id,
          message: `Successfully placed ${tradeDirection} hedge for ${volume} lots of ${symbol}`
        };
        
        console.log(`[DEBUG][${requestId}] Sending successful response:`, response);
        return res.json(response);
        
      } catch (tradeError) {
        console.error(`[DEBUG][${requestId}] Error executing trade:`, tradeError);
        throw tradeError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      console.error('[Trade API] Error executing hedge:', error);
      return res.status(500).json({ 
        status: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add explicit close trade endpoint to support dashboard.tsx
  app.post("/api/xtb/trades/:tradeOrderNumber/close", async (req, res) => {
    res.header('Content-Type', 'application/json');
    const requestId = Date.now().toString();

    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        status: false,
        error: 'Not authenticated' 
      });
    }

    const tradeOrderNumber = parseInt(req.params.tradeOrderNumber);
    if (isNaN(tradeOrderNumber)) {
      return res.status(400).json({ 
        status: false,
        error: 'Invalid trade order number' 
      });
    }

    try {
      console.log(`[Trade API][${requestId}] Closing trade ${tradeOrderNumber}`);
      
      // Use the new trade service to close the trade with broker "activtrades"
      const closeResponse = await tradeService.closeTrade(
        'activtrades', // Default broker as specified in requirements
        tradeOrderNumber
      );
      
      console.log(`[Trade API][${requestId}] Trade close response:`, closeResponse);
      
      return res.json({
        status: true,
        returnData: {
          order: tradeOrderNumber,
          price: closeResponse.price
        },
        message: `Successfully closed trade ${tradeOrderNumber}`
      });
    } catch (error) {
      console.error(`[Trade API][${requestId}] Error closing trade:`, error);
      return res.status(500).json({ 
        status: false,
        error: error instanceof Error ? error.message : String(error)
      });
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

      // Close the trade via new Trade API if there's a trade order number
      if (hedge.tradeOrderNumber) {
        try {
          console.log(`[Routes] Closing trade ${hedge.tradeOrderNumber} with Trade API`);
          
          // Use the new trade service with activtrades as the broker
          const closeResponse = await tradeService.closeTrade(
            'activtrades', // Default broker as specified in requirements
            hedge.tradeOrderNumber
          );

          console.log(`[Routes] Trade close response:`, closeResponse);
          console.log(`[Routes] Successfully closed trade ${hedge.tradeOrderNumber} with the Trade API`);
        } catch (tradeError) {
          // Log the error but continue with database deletion
          console.error(`[Routes] Error closing trade ${hedge.tradeOrderNumber}:`, tradeError);
        }
      }

      // Always delete the hedge from database, even if trade closing fails
      const [deletedHedge] = await db
        .delete(hedges)
        .where(eq(hedges.id, hedgeId))
        .returning();

      res.json({ 
        status: true,
        message: "Hedge deleted successfully" 
      });
    } catch (error) {
      console.error('Error deleting hedge:', error);
      res.status(500).json({ 
        status: false, 
        error: error instanceof Error ? error.message : "Failed to delete hedge" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}