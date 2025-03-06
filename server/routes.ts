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
  // app.use(xtbRouter); // Removed - we're using direct routes below

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

  // XTB API route for hedge execution - ROUTED THROUGH FLASK SERVER at http://3.147.6.168
  app.post("/api/xtb/hedge", async (req, res) => {
    res.header('Content-Type', 'application/json');

    try {
      console.log('[XTB Backend] Processing hedge request with request ID:', Date.now().toString());
      
      // Login first with more reliable error handling
      try {
        const loginResponse = await fetch('http://3.147.6.168/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 17535100, 
            password: "GuiZarHoh2711!"
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (!loginResponse.ok) {
          throw new Error(`Login failed with status ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        if (!loginData.status) {
          throw new Error(loginData.errorDescr || 'Login failed');
        }
        
        console.log('[XTB Backend] Login successful');
      } catch (loginError) {
        console.error('[XTB Backend] Login error:', loginError);
        throw new Error(`XTB Login failed: ${loginError.message}`);
      }

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
      console.log(`[XTB Backend] Placing trade: ${tradeDirection} ${volume} lots of ${symbol}`);

      // Create command structure with proper fields
      const commandData = {
        commandName: "tradeTransaction",
        arguments: {
          tradeTransInfo: {
            cmd: tradeDirection === 'buy' ? 0 : 1,
            symbol: symbol,
            volume: volume,
            price: 0.0,
            type: 0,
            order: 0,
            customComment: `Hedgi-${Date.now()}`
          }
        }
      };

      // Execute the trade with appropriate timeout
      const response = await fetch('http://3.147.6.168/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandData),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`Flask server responded with status: ${response.status}`);
      }

      const apiResponse = await response.json();
      console.log('[XTB Backend] Trade response:', apiResponse);

      if (!apiResponse.status) {
        throw new Error(`XTB API error: ${apiResponse.errorDescr || 'Unknown error'}`);
      }

      // Ensure we have a valid order number
      const tradeOrderNumber = apiResponse.returnData?.order;
      if (!tradeOrderNumber) {
        throw new Error('No order number returned from XTB API');
      }

      // Return the confirmed response with order number
      return res.json({
        status: true,
        returnData: {
          order: tradeOrderNumber
        }
      });
    } catch (error) {
      console.error('[XTB Backend] Error executing hedge:', error);
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

  // Optimized endpoint to check trade status
  app.get("/api/hedges/status/:tradeOrderNumber", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const tradeOrderNumber = parseInt(req.params.tradeOrderNumber);
    if (isNaN(tradeOrderNumber)) {
      return res.status(400).send("Invalid trade order number");
    }

    try {
      // Login first to ensure we have a valid session
      const loginResponse = await fetch('http://3.147.6.168/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 17535100, 
          password: "GuiZarHoh2711!"
        }),
        signal: AbortSignal.timeout(5000) // Short timeout for login
      });

      if (!loginResponse.ok) {
        throw new Error(`Login failed with status ${loginResponse.status}`);
      }

      // Use simplified command for getting trades
      const commandData = {
        commandName: "getTrades",
        arguments: { openedOnly: true }
      };

      // Send command with reduced timeout
      const response = await fetch('http://3.147.6.168/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandData),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Flask server responded with status: ${response.status}`);
      }

      const apiResponse = await response.json();
      
      if (!apiResponse.status) {
        throw new Error(`XTB API error: ${apiResponse.errorDescr || 'Unknown error'}`);
      }

      // Find the specific trade in the returned array
      const trade = apiResponse.returnData?.find(t => parseInt(t.order) === tradeOrderNumber);

      if (!trade) {
        return res.json({ 
          status: true, 
          found: false, 
          message: `Trade with order number ${tradeOrderNumber} not found` 
        });
      }

      // Return a simplified trade object
      res.json({
        status: true,
        found: true,
        trade: {
          order: trade.order,
          symbol: trade.symbol,
          volume: trade.volume,
          cmd: trade.cmd,
          open_price: trade.open_price,
          open_time: trade.open_time,
          profit: trade.profit
        }
      });
    } catch (error) {
      console.error('Error checking trade status:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check trade status" });
    }
  });


  app.post("/api/hedges", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // Use a unique request ID for tracking this transaction
      const requestId = Date.now().toString();
      console.log(`[XTB Backend] Processing hedge request from /api/hedges with ID: ${requestId}`);
      
      // Parse and validate request data
      const { amount, baseCurrency, targetCurrency, tradeDirection, duration } = req.body;
      
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
      console.log(`[XTB Backend][${requestId}] Placing ${tradeDirection} order for ${volume} lots of ${symbol}`);

      // Execute the trade by forwarding to external Flask server
      try {
        // Login first - essential for authorization
        const loginResponse = await fetch('http://3.147.6.168/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 17535100, 
            password: "GuiZarHoh2711!"
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (!loginResponse.ok) {
          throw new Error(`Login failed with status ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        if (!loginData.status) {
          throw new Error(loginData.errorDescr || 'Login failed');
        }
        
        // Execute trade with consistent command structure
        const commandData = {
          commandName: "tradeTransaction",
          arguments: {
            tradeTransInfo: {
              cmd: tradeDirection === 'buy' ? 0 : 1,
              symbol: symbol,
              volume: volume,
              price: 0.0, // Market execution
              type: 0,     // Open position
              order: 0,    // New order
              customComment: `Hedgi-${requestId}` // Add request ID to help tracking
            }
          }
        };

        const tradeResponse = await fetch('http://3.147.6.168/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commandData),
          signal: AbortSignal.timeout(15000)
        });

        if (!tradeResponse.ok) {
          throw new Error(`Flask server responded with status: ${tradeResponse.status}`);
        }

        const apiResponse = await tradeResponse.json();
        console.log(`[XTB Backend][${requestId}] Trade response:`, apiResponse);

        if (!apiResponse.status) {
          throw new Error(`XTB API error: ${apiResponse.errorDescr || 'Unknown error'}`);
        }

        // Extract the order number from response
        const tradeOrderNumber = apiResponse.returnData?.order;
        if (!tradeOrderNumber) {
          throw new Error('No valid order number returned from XTB API');
        }

        // Save successful trade to database
        const newHedge = await db.insert(hedges).values({
          userId: req.user.id,
          baseCurrency: baseCurrency,
          targetCurrency: targetCurrency,
          amount: volume * 100000 * (tradeDirection === 'buy' ? 1 : -1),
          rate: 0.0, // Will be updated with real rate from status check
          duration: duration || 30,
          status: 'active',
          tradeOrderNumber: tradeOrderNumber,
          tradeStatus: 'open'
        }).returning();

        console.log(`[XTB Backend][${requestId}] Saved hedge to database: ID=${newHedge[0]?.id}, OrderNumber=${tradeOrderNumber}`);
        
        // Return a successful response in the format expected by the client
        return res.json({
          status: true,
          returnData: {
            order: tradeOrderNumber
          },
          hedgeId: newHedge[0]?.id
        });
        
      } catch (tradeError) {
        console.error(`[XTB Backend][${requestId}] Error executing trade:`, tradeError);
        throw tradeError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      console.error('[XTB Backend] Error executing hedge:', error);
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
          currentPrice || 1.0, // Use current market price if available
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