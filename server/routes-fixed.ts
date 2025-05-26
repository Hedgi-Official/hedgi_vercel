import { db } from "@db";
import { users, hedges, trades } from "@db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import secondaryRateRouter from "./routes/secondary-rate";
import chatRouter from "./routes/chat";
import activtradesRouter from "./routes/activtrades-rate";
import tickmillRouter from "./routes/tickmill-rate";
import fbsRouter from "./routes/fbs-rate";
import paymentRouter from "./routes/payment";
import simulateRouter from "./routes/simulate";

const FLASK = process.env.FLASK_URL || "http://3.145.164.47";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register existing routes
  app.use(secondaryRateRouter);
  app.use(chatRouter);
  app.use(activtradesRouter);
  app.use(tickmillRouter);
  app.use(fbsRouter);
  app.use(paymentRouter);
  app.use(simulateRouter);

  // **SIMPLE FLASK PROXY ENDPOINTS**

  // 1. Create a new trade → POST /api/trades (proxy to Flask)
  app.post('/api/trades', async (req: Request, res: Response) => {
    try {
      console.log('[Express Proxy] Forwarding trade request to Flask:', req.body);
      
      const response = await fetch(`${FLASK}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });

      console.log('[Express Proxy] Flask response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Express Proxy] Flask error:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      console.log('[Express Proxy] Flask success:', result);
      
      // Save the Flask trade to our local database for history tracking
      try {
        const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 7; // Default to user 7 for now
        await db.insert(trades).values({
          id: result.id, // Use Flask ID as the database ID
          userId: userId,
          ticket: `FLASK-${result.id}`,
          broker: 'flask',
          volume: result.volume.toString(),
          symbol: result.symbol,
          openTime: new Date(result.created_at),
          durationDays: result.metadata?.days || 7,
          status: 'open',
          flaskTradeId: result.id,
          metadata: result.metadata || {}
        });
        console.log('[Express Proxy] Saved trade to local database - Flask ID:', result.id);
      } catch (dbError) {
        console.error('[Express Proxy] Failed to save to local database:', dbError);
        // Don't fail the request if database save fails
      }
      
      res.json(result);
    } catch (error) {
      console.error('[Express Proxy] Error:', error);
      res.status(500).json({ error: 'Proxy error: ' + (error as Error).message });
    }
  });

  // 2. Poll a trade's status → GET /api/trades/:tradeId/status (proxy to Flask)
  app.get('/api/trades/:tradeId/status', async (req: Request, res: Response) => {
    try {
      const tradeId = req.params.tradeId;
      console.log('[Express Proxy] Checking trade status for ID:', tradeId);
      
      const response = await fetch(`${FLASK}/trades/${tradeId}/status`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Express Proxy] Flask status error:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      console.log('[Express Proxy] Flask status response:', result);
      
      // Update the local database with the latest status from Flask
      try {
        const updateData: any = { 
          status: result.status, 
          updatedAt: new Date()
        };

        // Use closedAt from Flask if provided
        if (result.closedAt) {
          updateData.closedAt = new Date(result.closedAt);
        }

        await db.update(trades)
          .set(updateData)
          .where(eq(trades.id, Number(tradeId)));

        console.log(`[Express Proxy] Updated trade ${tradeId} status in database to: ${result.status}`);
      } catch (dbError) {
        console.error('[Express Proxy] Failed to update database:', dbError);
        // Don't fail the request if database update fails
      }
      
      res.json(result);
    } catch (error) {
      console.error('[Express Proxy] Status check error:', error);
      res.status(500).json({ error: 'Proxy error: ' + (error as Error).message });
    }
  });

  // 3. Close a trade early → POST /api/trades/:tradeId/close (proxy to Flask)
  app.post('/api/trades/:tradeId/close', async (req: Request, res: Response) => {
    try {
      const tradeId = req.params.tradeId;
      console.log('[Express Proxy] Closing trade ID:', tradeId);
      
      const response = await fetch(`${FLASK}/trades/${tradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Express Proxy] Flask close error:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      console.log('[Express Proxy] Flask close response:', result);
      res.json(result);
    } catch (error) {
      console.error('[Express Proxy] Close error:', error);
      res.status(500).json({ error: 'Proxy error: ' + (error as Error).message });
    }
  });

  // 4. Get active trades → GET /api/trades (returns non-CLOSED/FAILED trades)
  app.get('/api/trades', async (req: Request, res: Response) => {
    try {
      console.log('[Express Proxy] Getting active trades from database');

      // Get all trades and filter to only show active ones
      const allTrades = await db.query.trades.findMany({
        orderBy: desc(trades.createdAt),
        limit: 100
      });

      const activeTrades = [];

      for (const trade of allTrades) {
        if (!trade.flaskTradeId) continue;

        try {
          // Get current status from Flask
          const response = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`);
          if (!response.ok) continue;

          const flaskData = await response.json();

          // Only include trades that are NOT completed
          if (!['CLOSED', 'FAILED', 'closed', 'failed'].includes(flaskData.status)) {
            activeTrades.push({
              ...trade,
              status: flaskData.status,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`[Express Proxy] Error checking Flask status for trade ${trade.id}:`, error);
        }

        // Limit to 50 active trades
        if (activeTrades.length >= 50) break;
      }

      console.log('[Express Proxy] Found active trades:', activeTrades.length);
      res.json(activeTrades);
    } catch (error) {
      console.error('[Express Proxy] Active trades error:', error);
      res.status(500).json({ error: 'Failed to fetch active trades' });
    }
  });

  // 5. Get trade history → GET /api/trades/history (proxy to Flask)
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    try {
      console.log('[Express Proxy] Getting trade history from database');

      // Get all trades and filter to only show completed ones
      const allTrades = await db.query.trades.findMany({
        orderBy: desc(trades.createdAt),
        limit: 100
      });

      const completedTrades = [];

      for (const trade of allTrades) {
        if (!trade.flaskTradeId) continue;

        try {
          // Get current status from Flask
          const response = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`);
          if (!response.ok) continue;

          const flaskData = await response.json();

          // Only include trades that are CLOSED or FAILED
          if (['CLOSED', 'FAILED', 'closed', 'failed'].includes(flaskData.status)) {
            completedTrades.push({
              ...trade,
              status: flaskData.status,
              closedAt: flaskData.closedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`[Express Proxy] Error checking Flask status for trade ${trade.id}:`, error);
        }

        // Limit to 50 completed trades
        if (completedTrades.length >= 50) break;
      }

      console.log('[Express Proxy] Found completed trades:', completedTrades.length);
      res.json(completedTrades);
    } catch (error) {
      console.error('[Express Proxy] History error:', error);
      res.status(500).json({ error: 'Failed to fetch trade history' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}