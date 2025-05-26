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

  const result = (await flaskRes.json()) as {
        status:   string;
        closedAt?: string;
      };
      console.log('[Express] Flask status response:', result);

      // 2) Prepare what to update
      const updateData: any = {
        status:    result.status.toUpperCase(),
        updatedAt: new Date()
      };
      if (result.closedAt) {
        updateData.closedAt = new Date(result.closedAt);
      }

      // 3) Persist it
      await db.update(trades)
        .set(updateData)
        .where(eq(trades.id, tradeId));
      console.log(`[Express] Updated trade ${tradeId} in DB:`, updateData);

      // 4) Build the response payload
      const payload: any = { status: updateData.status };
      if (updateData.closedAt) {
        // send back the ISO string so the client can format it
        payload.closedAt = updateData.closedAt.toISOString();
      }

      return res.json(payload);
    } catch (err) {
      console.error('[Express] Status check error:', err);
      return res.status(500).json({ error: 'Proxy error: ' + (err as Error).message });
    }
  });

  // 3. Close a trade early → POST /api/trades/:tradeId/close (proxy to Flask)
  app.get('/api/trades/:tradeId/status', async (req: Request, res: Response) => {
    try {
      // 1) Parse the tradeId as a number
      const tradeId = Number(req.params.tradeId);
      console.log('[Express] Checking trade status for ID:', tradeId);

      // 2) Fetch from Flask
      const flaskRes = await fetch(`${FLASK}/trades/${tradeId}/status`);
      if (!flaskRes.ok) {
        const errorText = await flaskRes.text();
        console.error('[Express] Flask status error:', errorText);
        return res.status(flaskRes.status).json({ error: errorText });
      }

      // 3) Parse the JSON from flaskRes (not `response`)
      const result = (await flaskRes.json()) as {
        status:   string;
        closedAt?: string;
      };
      console.log('[Express] Flask status response:', result);

      // 4) Build the update object, only setting closedAt if Flask gave us one
      const updateData: Partial<{
        status: string;
        closedAt: Date;
        updatedAt: Date;
      }> = {
        status:    result.status.toUpperCase(),
        updatedAt: new Date()
      };
      if (result.closedAt) {
        updateData.closedAt = new Date(result.closedAt);
      }

      // 5) Write it back into *this* server’s DB
      await db.update(trades)
        .set(updateData)
        .where(eq(trades.id, tradeId));
      console.log(`[Express] Updated trade ${tradeId} in DB:`, updateData);

      // 6) Return exactly what the client expects
      const payload: { status: string; closedAt?: string } = {
        status: updateData.status!
      };
      if (updateData.closedAt) {
        payload.closedAt = updateData.closedAt.toISOString();
      }
      return res.json(payload);

    } catch (err) {
      console.error('[Express] Status check error:', err);
      return res.status(500).json({ error: 'Proxy error: ' + (err as Error).message });
    }
  });


  // 4. Get trade history → GET /api/trades/history (proxy to Flask)
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    try {
      console.log('[Express Proxy] Getting trade history from database');
      
      // Get trade history from local database instead of Flask
      const tradeHistory = await db.query.trades.findMany({
        orderBy: desc(trades.createdAt),
        limit: 50
      });
      
      console.log('[Express Proxy] Found trades in database:', tradeHistory.length);
      res.json(tradeHistory);
    } catch (error) {
      console.error('[Express Proxy] History error:', error);
      res.status(500).json({ error: 'Failed to fetch trade history' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}