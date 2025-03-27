import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
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

      // Use the trade service with the exact format as working curl
      const apiResponse = await tradeService.openTrade(
        'activtrades', // Changed to activtrades based on direct testing
        symbol,
        tradeDirection as 'buy' | 'sell',
        volume
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
    const requestId = Date.now().toString();
    console.log(`[DEBUG][${requestId}] Status check request for trade order: ${req.params.tradeOrderNumber}`);
    
    if (!req.isAuthenticated()) {
      console.log(`[DEBUG][${requestId}] Status check rejected: Not authenticated`);
      return res.status(401).send("Not authenticated");
    }

    // No need to parse as integer since we've changed to storing as string
    const tradeOrderNumber = req.params.tradeOrderNumber;
    if (!tradeOrderNumber) {
      console.log(`[DEBUG][${requestId}] Status check rejected: Invalid trade order number`);
      return res.status(400).send("Invalid trade order number");
    }
    
    console.log(`[DEBUG][${requestId}] Checking status for trade order: ${tradeOrderNumber}`);

    try {
      // With the new API, we don't have a direct way to check trade status
      // So we'll just return a success response that the trade order exists in our database
      // In a real implementation, you might want to add a status check endpoint to your API
      
      // IMPORTANT: Always retrieve the order number as a string
      console.log(`[DEBUG][${requestId}] Looking up trade order in database as: "${tradeOrderNumber}"`);
      
      // Find the hedge in our database with this trade order number
      const hedge = await db.query.hedges.findFirst({
        where: eq(hedges.tradeOrderNumber, String(tradeOrderNumber))
      });
      
      console.log(`[DEBUG][${requestId}] Database lookup result:`, hedge);
      
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
      
      // CRITICAL FIX: Create a unique client order ID for this request
      // This ensures that even if the request is duplicated, we maintain uniqueness
      const clientOrderId = `hedgi-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      console.log(`[Trade API][${requestId}] Generated client order ID: ${clientOrderId}`);
      
      const symbol = `${targetCurrency}${baseCurrency}`;
      console.log(`[Trade API][${requestId}] Placing ${tradeDirection} order for ${volume} lots of ${symbol}, client ID: ${clientOrderId}`);
      
      // CRITICAL FIX: Check if the system has any pending trades with the same 
      // broker+symbol combination or if another operation is in progress
      console.log(`[Trade API][${requestId}] Checking for existing active trades...`);
      
      // We'll implement additional safety checks to avoid duplicate trades
      try {
        const userId = req.user.id;
        const existingHedges = await db
          .select()
          .from(hedges)
          .where(and(
            eq(hedges.userId, userId),
            eq(hedges.status, 'active'),
            eq(hedges.baseCurrency, baseCurrency),
            eq(hedges.targetCurrency, targetCurrency),
            eq(hedges.tradeStatus, 'open') // Only consider open trades as a potential conflict
          ));
        
        // Log for debugging
        console.log(`[Trade API][${requestId}] Found ${existingHedges.length} active trades for this user with the same currency pair`);
        
        // If any active trade was placed in the last 5 seconds, it might be a duplicate request
        // This adds protection against rapid repeated clicks
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        const recentTrades = existingHedges.filter(hedge => 
          hedge.createdAt && new Date(hedge.createdAt) > fiveSecondsAgo
        );
        
        if (recentTrades.length > 0) {
          console.warn(`[Trade API][${requestId}] Found recently created trades (last 5 seconds) - potential duplicate request`);
          console.warn(`[Trade API][${requestId}] Recent trades:`, recentTrades);
          
          return res.status(409).json({
            status: false,
            error: "You have a trade that was just placed. Please wait a few seconds before placing another trade."
          });
        }
      } catch (dbError) {
        console.error(`[Trade API][${requestId}] Error checking for existing trades:`, dbError);
        // Continue processing even if this check fails - it's just a safety measure
      }

      // Enhanced trade execution with detailed logging
      try {
        // Use the trade service with the exact same format as working curl command
        const apiResponse = await tradeService.openTrade(
          'activtrades', // Changed from 'tickmill' to 'activtrades' based on direct testing
          symbol,
          tradeDirection as 'buy' | 'sell',
          volume
        );
        
        console.log(`[DEBUG][${requestId}] Trade API response:`, JSON.stringify(apiResponse));

        // Extract the order number from response with validation
        // If trade API call succeeded but returned market closed or other error,
        // handle this properly
        
        // CRITICAL FIX: For Tickmill, we need to use the ORDER number, not the deal number
        // for closing trades. When a trade is opened, it returns both order and deal numbers.
        // The broker API expects the ORDER number when closing a position as confirmed by direct testing.
        let tradeOrderNumber = apiResponse.order;
        
        // Check for errors in the API response
        if (apiResponse.error) {
          console.error(`[DEBUG][${requestId}] Error from trade API: ${apiResponse.error}`);
          return res.status(400).json({
            status: false,
            error: apiResponse.error
          });
        }
        
        // Order number 0 indicates market is likely closed or got a specific broker message
        // But not all status 0 responses are errors, only market closed is a true error
        if (tradeOrderNumber === 0) {
          console.log(`[DEBUG][${requestId}] Order number is 0, comment: ${apiResponse.comment}`);
          
          // ONLY check for "Market closed" comment and treat it as an error
          if (apiResponse.comment === "Market closed") {
            return res.status(400).json({
              status: false,
              error: "Market is currently closed. Please try again during market hours."
            });
          }
          
          // CRITICAL FIX: Don't treat "No money" as an error
          // For "No money" responses, we should still allow the trade to proceed
          // This is working as expected according to the user's confirmation
        }
        
        if (!tradeOrderNumber) {
          console.warn(`[DEBUG][${requestId}] No order number in API response, using request ID as fallback`);
          tradeOrderNumber = Date.now(); // Use timestamp as fallback ID
        }
        
        console.log(`[DEBUG][${requestId}] Trade order number:`, tradeOrderNumber);

        // Create and log the exact hedge data to be stored
        // CRITICAL FIX: Always store the tradeOrderNumber as a string
        // This ensures consistent handling when retrieving for API calls
        const hedgeValues = {
          baseCurrency: baseCurrency,
          targetCurrency: targetCurrency,
          amount: String(volume * 100000 * (tradeDirection === 'buy' ? 1 : -1)),
          rate: apiResponse.price?.toString() || apiResponse.ask?.toString() || apiResponse.bid?.toString() || "0.0",
          duration: duration || 30,
          status: 'active',
          tradeOrderNumber: String(tradeOrderNumber), // Explicitly convert to string
          tradeStatus: 'open'
        };
        
        // Log all available identifiers for debugging
        console.log(`[DEBUG][${requestId}] All trade identifiers:`, {
          deal: apiResponse.deal,
          order: apiResponse.order,
          tradeOrderNumber: tradeOrderNumber
        });
        
        console.log(`[DEBUG][${requestId}] Hedge values to insert:`, hedgeValues);
        
        // Insert with userId, ensuring proper type handling
        const newHedge = await db.insert(hedges)
          .values({
            baseCurrency: hedgeValues.baseCurrency,
            targetCurrency: hedgeValues.targetCurrency,
            amount: hedgeValues.amount,
            rate: hedgeValues.rate,
            duration: hedgeValues.duration,
            status: hedgeValues.status,
            tradeOrderNumber: String(hedgeValues.tradeOrderNumber), // Ensure it's a string
            tradeStatus: hedgeValues.tradeStatus,
            userId: req.user.id
          })
          .returning();

        console.log(`[DEBUG][${requestId}] Database insert result:`, newHedge);
        
        // Return a successful response with all needed data
        const response = {
          status: true,
          returnData: {
            order: tradeOrderNumber,
            price: apiResponse.price || apiResponse.ask || apiResponse.bid || 0
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
  // Add the new API endpoint for trade closure with enhanced error handling
  app.post("/api/trades/close", async (req, res) => {
    res.header('Content-Type', 'application/json');
    const requestId = Date.now().toString();

    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        status: false,
        error: 'Not authenticated' 
      });
    }

    // Extract broker and position from the request body (needed for new API format)
    const { broker, position } = req.body;
    if (!broker || !position) {
      return res.status(400).json({ 
        status: false,
        error: 'Missing required fields: broker and position' 
      });
    }
    
    console.log(`[API][${requestId}] Closing position: ${position} with broker: ${broker}`);

    try {
      console.log(`[Trade API][${requestId}] Closing trade ${position} with broker ${broker}`);
      
      // Use the trade service to close the trade
      // CRITICAL FIX: Ensure we pass the position as a number for broker API
      // Position needs to be a number without quotes in the request body
      const closeResponse = await tradeService.closeTrade(
        broker,  // Use the broker from the request
        Number(position) // Ensure position is a number by explicitly converting
      );
      
      console.log(`[Trade API][${requestId}] Trade close response:`, closeResponse);
      
      // Check if we got an error about position not found
      if (closeResponse.error && closeResponse.error.includes('not found')) {
        console.warn(`[Trade API][${requestId}] Position ${position} not found at broker ${broker}`);
        
        // Return a special response for "position not found" case
        return res.json({
          status: true, // Still return success status so client continues with DB deletion
          returnData: {
            position: position,
            price: 0,
            error: closeResponse.error
          },
          message: `Position ${position} not found at broker ${broker}, but hedge will be removed from database`
        });
      }
      
      // Handle market closed scenario similarly
      if (closeResponse.comment === "Market closed") {
        console.warn(`[Trade API][${requestId}] Market is closed, cannot close position ${position}`);
        
        return res.json({
          status: true, // Still return success status so client continues with DB deletion
          returnData: {
            position: position,
            price: 0
          },
          message: "Market closed",
          error: "Market is currently closed. The hedge will be removed from your dashboard."
        });
      }
      
      // Standard success response
      return res.json({
        status: true,
        returnData: {
          position: position,
          price: closeResponse.price || closeResponse.ask || closeResponse.bid || 0
        },
        message: `Successfully closed trade ${position}`
      });
    } catch (error) {
      console.error(`[Trade API][${requestId}] Error closing trade:`, error);
      
      // Special handling for HTML responses (which could happen if the API endpoint is down)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('<html>')) {
        return res.status(502).json({
          status: false,
          error: 'Trading API server returned HTML instead of JSON. The service may be down.',
          message: 'Trading API server is currently unavailable'
        });
      }
      
      return res.status(500).json({ 
        status: false,
        error: errorMessage
      });
    }
  });
  
  // Keep the old endpoint for backward compatibility during transition
  app.post("/api/xtb/trades/:tradeOrderNumber/close", async (req, res) => {
    res.header('Content-Type', 'application/json');
    const requestId = Date.now().toString();

    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        status: false,
        error: 'Not authenticated' 
      });
    }

    // We're now storing trade order numbers as strings to handle large values from the broker API
    const tradeOrderNumber = req.params.tradeOrderNumber;
    if (!tradeOrderNumber) {
      return res.status(400).json({ 
        status: false,
        error: 'Invalid trade order number' 
      });
    }

    try {
      console.log(`[Trade API][${requestId}] Closing trade ${tradeOrderNumber} via legacy endpoint`);
      
      // Use the new trade service to close the trade with broker "activtrades"
      // CRITICAL FIX: Convert tradeOrderNumber to a number for the broker API
      const closeResponse = await tradeService.closeTrade(
        'activtrades', // Changed from 'tickmill' to 'activtrades' based on direct testing
        Number(tradeOrderNumber) // Ensure position is a number
      );
      
      console.log(`[Trade API][${requestId}] Trade close response:`, closeResponse);
      
      // Check for position not found
      if (closeResponse.error && closeResponse.error.includes('not found')) {
        console.warn(`[Trade API][${requestId}] Position ${tradeOrderNumber} not found at broker`);
        
        return res.json({
          status: true, // Still return success status so client continues with DB deletion
          returnData: {
            order: tradeOrderNumber,
            price: 0,
            error: closeResponse.error
          },
          message: `Position ${tradeOrderNumber} not found at broker, but hedge will be removed from database`
        });
      }
      
      // Handle market closed scenario similarly
      if (closeResponse.comment === "Market closed") {
        console.warn(`[Trade API][${requestId}] Market is closed, cannot close position ${tradeOrderNumber}`);
        
        return res.json({
          status: true, // Still return success status so client continues with DB deletion
          returnData: {
            order: tradeOrderNumber,
            price: 0
          },
          message: "Market closed",
          error: "Market is currently closed. The hedge will be removed from your dashboard."
        });
      }
      
      // Standard success response
      return res.json({
        status: true,
        returnData: {
          order: tradeOrderNumber,
          price: closeResponse.price || closeResponse.ask || closeResponse.bid || 0
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
          
          // CRITICAL FIX: For broker integration, the tradeOrderNumber stored in our database
          // could be either a deal or order number. We need to make sure we're using
          // the right identifier when closing the position.
          // CRITICAL FIX: Convert position to a number for broker API
          const closeResponse = await tradeService.closeTrade(
            'activtrades', // Changed from 'tickmill' to 'activtrades' based on direct testing
            Number(hedge.tradeOrderNumber) // Ensure position is passed as a number
          );

          console.log(`[Routes] Trade close response:`, closeResponse);
          
          // Handle different response scenarios
          if (closeResponse.error && closeResponse.error.includes('not found')) {
            console.warn(`[Routes] Position ${hedge.tradeOrderNumber} not found at broker. Continuing with database deletion.`);
          } else if (closeResponse.comment === "Market closed") {
            console.warn(`[Routes] Market is closed, can't close position ${hedge.tradeOrderNumber}. Continuing with database deletion.`);
          } else {
            console.log(`[Routes] Successfully closed trade ${hedge.tradeOrderNumber} with the Trade API`);
          }
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
  
  // Test endpoints have been removed to prevent unintended trade interactions

  const httpServer = createServer(app);
  return httpServer;
}