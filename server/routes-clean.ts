import { db } from "@db";
import { users, hedges } from "@db/schema";
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
      res.json(result);
    } catch (error) {
      console.error('[Express Proxy] Error:', error);
      res.status(500).json({ error: 'Proxy error: ' + (error as Error).message });
    }
  });

  // 2. Poll a trade's status → GET /api/trades/:tradeId/status
  app.get('/api/trades/:tradeId/status', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const trade = await db.query.flaskTrades.findFirst({
        where: eq(flaskTrades.id, parseInt(req.params.tradeId))
      });

      if (!trade || trade.userId !== req.user.id) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      // Get status from Flask
      const response = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`);
      const { status } = await response.json();

      // Map status to UI labels
      const statusMap: Record<string, string> = {
        'NEW': 'Order sent',
        'Executed': 'Order placed',
        'Closed': 'Closed',
        'FAILED': 'Failed'
      };

      // Update local DB
      await db.update(flaskTrades)
        .set({ status, updatedAt: new Date() })
        .where(eq(flaskTrades.id, trade.id));

      res.json({ 
        status, 
        label: statusMap[status] || status 
      });
    } catch (error) {
      console.error('Error checking trade status:', error);
      res.status(500).json({ error: 'Failed to check status' });
    }
  });

  // 3. Close a trade early → POST /api/trades/:tradeId/close
  app.post('/api/trades/:tradeId/close', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const trade = await db.query.flaskTrades.findFirst({
        where: eq(flaskTrades.id, parseInt(req.params.tradeId))
      });

      if (!trade || trade.userId !== req.user.id) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      // Send close request to Flask
      const response = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Error closing trade:', error);
      res.status(500).json({ error: 'Failed to close trade' });
    }
  });

  // 4. History tab → GET /api/trades/history
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const historyTrades = await db.query.flaskTrades.findMany({
        where: inArray(flaskTrades.status, ['Closed', 'FAILED']),
        orderBy: desc(flaskTrades.updatedAt)
      });

      res.json(historyTrades);
    } catch (error) {
      console.error('Error fetching trade history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // Exchange rates endpoint (keeping this as it's unrelated to trades)
  const SUPPORTED_SYMBOLS = ['USDBRL', 'EURUSD', 'USDMXN'];
  
  app.get("/api/xtb/rates", async (req, res) => {
    res.header('Content-Type', 'application/json');
    console.log('[Exchange Rates DEBUG] Request received for /api/xtb/rates');

    try {
      const symbols = SUPPORTED_SYMBOLS;
      const rates = [];

      for (const symbol of symbols) {
        try {
          const rateReq = await fetch(`http://localhost:${process.env.PORT || 5000}/api/secondary-rate?symbol=${symbol}`);
          if (rateReq.ok) {
            const rateData = await rateReq.json();
            rates.push({
              symbol: symbol,
              bid: rateData.rate_data?.bid || 0,
              ask: rateData.rate_data?.ask || 0,
              spread: rateData.rate_data?.spread || 0,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`[Exchange Rates] Error fetching ${symbol}:`, error);
        }
      }
      
      if (!rates.length) {
        return res.status(503).json({ error: 'Exchange rate service unavailable' });
      }
      return res.json(rates);
    } catch (error) {
      console.error('[Exchange Rates] General error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return createServer(app);
}