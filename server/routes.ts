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

      // Use the trade service with the exact format as working curl
      const apiResponse = await tradeService.openTrade(
        'tickmill',
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
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    // No need to parse as integer since we've changed to storing as string
    const tradeOrderNumber = req.params.tradeOrderNumber;
    if (!tradeOrderNumber) {
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
        // Use the trade service with the exact same format as working curl command
        const apiResponse = await tradeService.openTrade(
          'tickmill',
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
        
        // Check for retcode - if not success (0 is success), treat as error
        if (apiResponse.retcode !== undefined && apiResponse.retcode !== 0) {
          console.error(`[DEBUG][${requestId}] Error: Trade API returned non-zero retcode: ${apiResponse.retcode}`);
          return res.status(400).json({
            status: false,
            error: `Broker returned error code: ${apiResponse.retcode}${apiResponse.comment ? ` - ${apiResponse.comment}` : ''}`
          });
        }
        
        // Order number 0 or missing indicates market is likely closed or got a specific broker message
        if (!tradeOrderNumber || tradeOrderNumber === 0) {
          console.log(`[DEBUG][${requestId}] Order number is ${tradeOrderNumber}, comment: ${apiResponse.comment}`);
          
          // Check for "Market closed" comment and treat it as an error
          if (apiResponse.comment === "Market closed") {
            return res.status(400).json({
              status: false,
              error: "Market is currently closed. Please try again during market hours."
            });
          }
          
          // Any other case with no order number should be treated as an error per user requirements
          if (!tradeOrderNumber) {
            return res.status(400).json({
              status: false,
              error: "Order was not placed with the broker. " + 
                     (apiResponse.comment ? `Reason: ${apiResponse.comment}` : "Unknown error occurred.")
            });
          }
        }
        
        console.log(`[DEBUG][${requestId}] Trade order number:`, tradeOrderNumber);

        // Create and log the exact hedge data to be stored
        const hedgeValues = {
          baseCurrency: baseCurrency,
          targetCurrency: targetCurrency,
          amount: String(volume * 100000 * (tradeDirection === 'buy' ? 1 : -1)),
          rate: apiResponse.price?.toString() || apiResponse.ask?.toString() || apiResponse.bid?.toString() || "0.0",
          duration: duration || 30,
          status: 'active',
          tradeOrderNumber: tradeOrderNumber, // This now contains either the deal or order number
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
      
      // Any broker errors or issues should trigger a confirmation
      if (closeResponse.error || (closeResponse.retcode !== undefined && closeResponse.retcode !== 0) || closeResponse.comment === "Market closed") {
        console.warn(`[Trade API][${requestId}] Issue with broker: ${closeResponse.error || closeResponse.comment || 'Unknown error'}`);
        
        // Determine the specific error message and type
        let errorMessage = "Failed to close the position with the broker.";
        let errorType = 'BROKER_CLOSE_FAILED';
        
        // Use the errorType from the trade service if available
        if (closeResponse.errorType === 'POSITION_NOT_FOUND') {
          errorMessage = `Position ${position} not found at the broker.`;
          errorType = 'POSITION_NOT_FOUND';
        } else if (closeResponse.errorType === 'MARKET_CLOSED' || closeResponse.comment === "Market closed") {
          errorMessage = "Market is currently closed so the position cannot be closed.";
          errorType = 'MARKET_CLOSED';
        } else if (closeResponse.error && closeResponse.error.includes('not found')) {
          // Fallback detection of position not found errors
          errorMessage = `Position ${position} not found at the broker.`;
          errorType = 'POSITION_NOT_FOUND';
        }
        
        // Log the actual error response and the error type we're sending
        console.log(`[Trade API][${requestId}] Sending error response:`, {
          errorType, 
          errorMessage,
          originalError: closeResponse.error || closeResponse.comment
        });
        
        // Return a special response that client will handle with confirmation dialog
        return res.json({
          status: false,
          errorType: errorType,
          error: closeResponse.error || closeResponse.comment || "Unknown broker error",
          message: `${errorMessage} Do you want to remove it from your dashboard anyway?`
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
      
      // Use the new trade service to close the trade with broker "tickmill"
      // CRITICAL FIX: Convert tradeOrderNumber to a number for the broker API
      const closeResponse = await tradeService.closeTrade(
        'tickmill', // Default broker as specified in requirements
        Number(tradeOrderNumber) // Ensure position is a number
      );
      
      console.log(`[Trade API][${requestId}] Trade close response:`, closeResponse);
      
      // Any broker errors or issues should trigger a confirmation
      if (closeResponse.error || (closeResponse.retcode !== undefined && closeResponse.retcode !== 0) || closeResponse.comment === "Market closed") {
        console.warn(`[Trade API][${requestId}] Issue with broker: ${closeResponse.error || closeResponse.comment || 'Unknown error'}`);
        
        // Determine the specific error message
        let errorMessage = "Failed to close the position with the broker.";
        
        if (closeResponse.error && closeResponse.error.includes('not found')) {
          errorMessage = `Position ${tradeOrderNumber} not found at the broker.`;
        } else if (closeResponse.comment === "Market closed") {
          errorMessage = "Market is currently closed so the position cannot be closed.";
        }
        
        // Return a special response that client will handle with confirmation dialog
        return res.status(400).json({
          status: false,
          errorType: 'BROKER_CLOSE_FAILED',
          error: closeResponse.error || closeResponse.comment || "Unknown broker error",
          message: `${errorMessage} Do you want to remove it from your dashboard anyway?`
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
          
          // Get forceDelete query param - if true, skip attempting to close with broker
          const forceDelete = req.query.forceDelete === 'true';
          
          if (forceDelete) {
            console.log(`[Routes] Forced deletion requested, skipping broker order close`);
          } else {
            // CRITICAL FIX: For Tickmill, the tradeOrderNumber stored in our database
            // could be either a deal or order number. We need to make sure we're using
            // the right identifier when closing the position.
            // CRITICAL FIX: Convert position to a number for broker API
            const closeResponse = await tradeService.closeTrade(
              'tickmill', // Default broker as specified in requirements
              Number(hedge.tradeOrderNumber) // Ensure position is passed as a number
            );

            console.log(`[Routes] Trade close response:`, closeResponse);
            
            // Handle all broker errors with confirmation dialog
            if (closeResponse.error || (closeResponse.retcode !== undefined && closeResponse.retcode !== 0)) {
              // Determine the type of error for appropriate messaging
              let errorMessage = "Failed to close the position with the broker.";
              let errorType = 'BROKER_CLOSE_FAILED';
              
              // Check for position not found errors - use the specific errorType if available
              if ((closeResponse as any).errorType === 'POSITION_NOT_FOUND' || 
                  (closeResponse.error && closeResponse.error.includes('not found'))) {
                console.warn(`[Routes] Position ${hedge.tradeOrderNumber} not found at broker.`);
                errorMessage = `Position ${hedge.tradeOrderNumber} not found at the broker.`;
                errorType = 'POSITION_NOT_FOUND'; // Use consistent error type
              } else if (closeResponse.comment === "Market closed") {
                console.warn(`[Routes] Market is closed, can't close position ${hedge.tradeOrderNumber}.`);
                errorMessage = "Market is currently closed so the position cannot be closed.";
              } else {
                // General error case
                console.error(`[Routes] Error closing trade ${hedge.tradeOrderNumber} with broker:`, 
                  closeResponse.error || `Return code: ${closeResponse.retcode}`);
              }
                
              // Return a special response for ALL broker close errors when forceDelete is not set
              // This will trigger a confirmation popup on the frontend
              return res.status(400).json({
                status: false,
                errorType: errorType,
                error: closeResponse.error || `Broker returned error code: ${closeResponse.retcode}`,
                message: `${errorMessage} Do you want to remove it from your dashboard anyway?`
              });
            } else {
              console.log(`[Routes] Successfully closed trade ${hedge.tradeOrderNumber} with the Trade API`);
            }
          }
        } catch (tradeError) {
          // Return a error that can be handled by the frontend with a confirmation dialog
          console.error(`[Routes] Error closing trade ${hedge.tradeOrderNumber}:`, tradeError);
          
          // Only return error if forceDelete is not set
          if (req.query.forceDelete !== 'true') {
            return res.status(400).json({
              status: false,
              errorType: 'BROKER_CLOSE_FAILED',
              error: tradeError instanceof Error ? tradeError.message : String(tradeError),
              message: "An error occurred while trying to close the position with the broker. Do you want to remove it from your dashboard anyway?"
            });
          }
          // Otherwise, continue with database deletion
        }
      }

      // Always delete the hedge from database if forceDelete is true or trade closing succeeded
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
  
  // Test endpoint for trade API integration
  // Test endpoint to close a trade without authentication
  app.post("/api/test-close-trade", async (req, res) => {
    const requestId = Date.now().toString();
    console.log(`[Test Close Trade API][${requestId}] Request received:`, req.body);
    
    try {
      const { broker = 'tickmill', position, useDeal = false } = req.body;
      
      if (!position) {
        return res.status(400).json({
          status: false,
          error: 'Missing required field: position'
        });
      }
      
      // Use the trade service to close the trade
      console.log(`[Test Close Trade API][${requestId}] Closing position ${position} with broker ${broker} (position type: ${typeof position})`);
      
      // CRITICAL FIX: Do NOT convert position to string - the API expects a number
      const closeResult = await tradeService.closeTrade(
        broker,
        position // Pass position as-is to our updated tradeService
      );
      
      console.log(`[Test Close Trade API][${requestId}] Close response:`, closeResult);
      
      res.json({
        status: true,
        result: closeResult,
        message: `Attempted to close trade: position ${position} via ${broker}`
      });
    } catch (error) {
      console.error(`[Test Close Trade API][${requestId}] Error:`, error);
      res.status(500).json({
        status: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/test-trade", async (req, res) => {
    const requestId = Date.now().toString();
    console.log(`[Test Trade API][${requestId}] Request received:`, req.body);
    
    try {
      const { broker = 'tickmill', symbol = 'USDBRL', direction = 'buy', volume = 0.1, autoClose = false } = req.body;
      
      console.log(`[Test Trade API][${requestId}] Executing ${direction} trade for ${volume} lots of ${symbol} via ${broker}`);
      
      // Use exact same format as working curl command
      const result = await tradeService.openTrade(
        broker,
        symbol,
        direction as 'buy' | 'sell',
        Number(volume)
      );
      
      console.log(`[Test Trade API][${requestId}] Trade response:`, result);
      
      // If autoClose flag is set, immediately close the trade for testing
      let closeResult = null;
      if (autoClose && result && (result.deal || result.order)) {
        try {
          // CRITICAL FIX: For Tickmill, we need to use the ORDER number, not the deal number
          // to close positions as confirmed by direct testing
          // CRITICAL FIX: Always use ORDER number, not deal number for closing positions
          const positionId = result.order;
          console.log(`[Test Trade API][${requestId}] Auto-closing trade position ${positionId} (deal: ${result.deal}, order: ${result.order})`);
          
          // Wait a bit to ensure the order is registered in the broker system
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // CRITICAL FIX: Do NOT convert position to string - the API expects a number
          closeResult = await tradeService.closeTrade(
            broker,
            positionId // Pass position number as-is
          );
          console.log(`[Test Trade API][${requestId}] Close response:`, closeResult);
        } catch (closeError) {
          console.error(`[Test Trade API][${requestId}] Error closing trade:`, closeError);
          closeResult = { error: closeError instanceof Error ? closeError.message : String(closeError) };
          // Continue with response even if close fails
        }
      }
      
      res.json({
        status: true,
        result,
        closeResult,
        message: `Successfully executed test trade: ${direction} ${volume} lots of ${symbol} via ${broker}${autoClose ? ' and attempted to close it' : ''}`
      });
    } catch (error) {
      console.error(`[Test Trade API][${requestId}] Error:`, error);
      res.status(500).json({ 
        status: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to execute test trade'
      });
    }
  });
  
  // Test endpoint for closing trades - doesn't require authentication
  app.post("/api/test-close-trade", async (req, res) => {
    const requestId = Date.now().toString();
    console.log(`[Test Close API][${requestId}] Request received:`, req.body);
    
    try {
      const { broker = 'tickmill', position } = req.body;
      
      if (!position) {
        return res.status(400).json({
          status: false,
          error: 'Missing required position number',
          message: 'Position/order number is required'
        });
      }
      
      console.log(`[Test Close API][${requestId}] Closing position ${position} via ${broker}`);
      
      // Use exact same format as working curl command - pass position as-is without converting to Number
      const result = await tradeService.closeTrade(
        broker,
        position
      );
      
      console.log(`[Test Close API][${requestId}] Close response:`, result);
      
      // Handle market closed scenario
      if (result.comment === "Market closed") {
        return res.json({
          status: false,  // For test endpoint, return false status to indicate issue
          result,
          message: "Market closed - cannot close position at this time"
        });
      }
      
      // Handle position not found
      if (result.error && result.error.includes('not found')) {
        return res.json({
          status: false,  // For test endpoint, return false status to indicate issue
          result,
          message: `Position ${position} not found at broker ${broker}`
        });
      }
      
      res.json({
        status: true,
        result,
        message: `Successfully closed position ${position} via ${broker}`
      });
    } catch (error) {
      console.error(`[Test Close API][${requestId}] Error:`, error);
      res.status(500).json({ 
        status: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to close trade'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}