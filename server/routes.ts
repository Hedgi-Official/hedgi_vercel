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
      console.log('[XTB Backend] Forwarding hedge request to Flask server at http://3.147.6.168');
      
      // Ensure we're logged in first
      try {
        // Set a timeout of 30 seconds for the login request
        const loginResponse = await fetch('http://3.147.6.168/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 17535100, 
            password: "GuiZarHoh2711!"
          }),
          // Add timeout options
          signal: AbortSignal.timeout(30000)
        });
        
        if (!loginResponse.ok) {
          throw new Error(`Login failed with status ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        console.log('[XTB Backend] Login response:', loginData);
        
        if (!loginData.status) {
          throw new Error(loginData.errorDescr || 'Login failed');
        }
      } catch (loginError) {
        console.error('[XTB Backend] Login error:', loginError);
        throw loginError;
      }
      
      // Format the request according to XTB API format
      const { amount, baseCurrency, targetCurrency, tradeDirection } = req.body;
      
      // Calculate volume in lots (1 lot = 100,000 units)
      const volume = Math.abs(Number(amount)) / 100000;
      
      // Format symbol correctly (e.g., EURUSD)
      const symbol = `${targetCurrency}${baseCurrency}`;
      
      // Format the command according to XTB API format
      const commandData = {
        commandName: "tradeTransaction",
        arguments: {
          tradeTransInfo: {
            cmd: tradeDirection === 'buy' ? 0 : 1, // 0 for BUY, 1 for SELL
            symbol: symbol,
            volume: volume,
            price: 1.0, // Market price (0 for market execution)
            offset: 0,
            order: 0, // New order
            type: 0 // Type 0 for open position
          }
        }
      };
      
      // Send the request to the Flask server's command endpoint
      const response = await fetch('http://3.147.6.168/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
        // Add timeout options
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error(`Flask server responded with status: ${response.status}`);
      }
      
      const apiResponse = await response.json();
      
      if (!apiResponse.status) {
        throw new Error(`XTB API error: ${apiResponse.errorDescr || 'Unknown error'}`);
      }
      
      // Format response to match what the client expects
      const hedgeResult = {
        status: apiResponse.status,
        tradeOrderNumber: apiResponse.returnData?.order || null
      };
      
      return res.send(JSON.stringify(hedgeResult));
    } catch (error) {
      console.error('[XTB Backend] Error executing hedge via Flask server:', error);
      return res.status(500).send(JSON.stringify({ 
        error: 'Failed to execute hedge via Flask server', 
        details: error instanceof Error ? error.message : String(error)
      }));
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
      // Format the command to get trade status according to XTB API
      const commandData = {
        commandName: "getTrades",
        arguments: { 
          openedOnly: true
        }
      };
      
      // Send the command to the Flask server
      const response = await fetch('http://3.147.6.168/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
        // Add timeout options
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error(`Flask server responded with status: ${response.status}`);
      }
      
      const apiResponse = await response.json();
      console.log(`[Routes] Trade status response for order ${tradeOrderNumber}:`, apiResponse);
      
      if (!apiResponse.status) {
        throw new Error(`XTB API error: ${apiResponse.errorDescr || 'Unknown error'}`);
      }
      
      // Find the specific trade in the returned array
      const trade = apiResponse.returnData?.find(t => t.order === tradeOrderNumber);
      
      if (!trade) {
        return res.json({ 
          status: true, 
          found: false, 
          message: `Trade with order number ${tradeOrderNumber} not found` 
        });
      }
      
      res.json({
        status: true,
        found: true,
        trade: trade
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
      console.log('[XTB Backend] Processing hedge request from /api/hedges');
      
      // Forward the request to the Flask server directly instead of redirecting
      const response = await fetch('http://3.147.6.168/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 17535100, 
          password: "GuiZarHoh2711!"
        }),
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
      }
      
      const loginData = await response.json();
      
      if (!loginData.status) {
        throw new Error(loginData.errorDescr || 'Login failed');
      }
      
      // Format the request according to XTB API format
      const { amount, baseCurrency, targetCurrency, tradeDirection } = req.body;
      
      // Calculate volume in lots (1 lot = 100,000 units)
      const volume = Math.abs(Number(amount)) / 100000;
      
      // Format symbol correctly (e.g., EURUSD)
      const symbol = `${targetCurrency}${baseCurrency}`;
      
      // Format the command according to XTB API format
      const commandData = {
        commandName: "tradeTransaction",
        arguments: {
          tradeTransInfo: {
            cmd: tradeDirection === 'buy' ? 0 : 1, // 0 for BUY, 1 for SELL
            symbol: symbol,
            volume: volume,
            price: 1.0, // Market price (0 for market execution)
            offset: 0,
            order: 0, // New order
            type: 0 // Type 0 for open position
          }
        }
      };
      
      // Send the request to the Flask server
      const tradeResponse = await fetch('http://3.147.6.168/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
        signal: AbortSignal.timeout(30000)
      });
      
      if (!tradeResponse.ok) {
        throw new Error(`Flask server responded with status: ${tradeResponse.status}`);
      }
      
      // Parse the response carefully
      const responseText = await tradeResponse.text();
      let apiResponse;
      
      try {
        apiResponse = JSON.parse(responseText);
        console.log('[XTB Backend] Trade API response:', JSON.stringify(apiResponse));
      } catch (parseError) {
        console.error('[XTB Backend] Error parsing JSON response:', parseError);
        console.log('[XTB Backend] Response text was:', responseText);
        throw new Error('Failed to parse response from XTB API');
      }
      
      // Check if the response has the expected structure
      if (!apiResponse || typeof apiResponse !== 'object') {
        throw new Error('Invalid response format from XTB API');
      }
      
      // Check the status with proper fallback
      const status = apiResponse.status === true;
      
      // Extract order number with safe fallbacks
      const orderNumber = apiResponse.returnData?.order || 
                         apiResponse.order || 
                         (Array.isArray(apiResponse.returnData) && apiResponse.returnData.length > 0 ? 
                          apiResponse.returnData[0].order : null);
      
      // Format response to match what the client expects
      const hedgeResult = {
        status: status,
        tradeOrderNumber: orderNumber
      };
      
      console.log('[XTB Backend] Parsed hedge result:', hedgeResult);
      
      return res.send(JSON.stringify(hedgeResult));
    } catch (error) {
      console.error('[XTB Backend] Error executing hedge via Flask server:', error);
      return res.status(500).send(JSON.stringify({ 
        error: 'Failed to execute hedge via Flask server', 
        details: error instanceof Error ? error.message : String(error)
      }));
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