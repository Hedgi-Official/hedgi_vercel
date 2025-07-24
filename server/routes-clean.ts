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

const FLASK = process.env.FLASK_URL;

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register existing routers
  app.use(secondaryRateRouter);
  app.use(chatRouter);
  app.use(activtradesRouter);
  app.use(tickmillRouter);
  app.use(fbsRouter);
  app.use(paymentRouter);
  app.use(simulateRouter);

  //
  // 1) Create a new trade → proxy POST /api/trades
  //
  app.post('/api/trades', async (req, res) => {
    try {
      console.log('[Proxy] POST /api/trades →', req.body);
      const flaskRes = await fetch(`${FLASK}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const text = await flaskRes.text();
      if (!flaskRes.ok) {
        console.error('[Proxy] Flask error:', text);
        return res.status(flaskRes.status).json({ error: text });
      }
      const result = JSON.parse(text);
      console.log('[Proxy] Flask success:', result);
      res.json(result);
    } catch (err) {
      console.error('[Proxy] POST /api/trades failed:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  //
  // 2) Check status → proxy GET /api/trades/:tradeId/status
  //
  app.get('/api/trades/:tradeId/status', async (req, res) => {
    try {
      const tradeId = req.params.tradeId;
      console.log('[Proxy] GET /api/trades/:tradeId/status →', tradeId);

      // 2a) ask Flask
      const flaskRes = await fetch(`${FLASK}/trades/${tradeId}/status`);
      const text = await flaskRes.text();
      if (!flaskRes.ok) {
        console.error('[Proxy] Flask status error:', text);
        return res.status(flaskRes.status).json({ error: text });
      }
      const { status } = JSON.parse(text);
      console.log('[Proxy] Flask returned status:', status);

      // 2b) update our own DB
      await db.update(trades)
              .set({ status, updatedAt: new Date() })
              .where(eq(trades.id, parseInt(tradeId)));
      console.log('[Proxy] Updated local trades table');

      // 2c) respond
      res.json({ status, label: statusMap[status] ?? status });
    } catch (err) {
      console.error('[Proxy] GET /api/trades/:tradeId/status failed:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  //
  // 3) Close early → proxy POST /api/trades/:tradeId/close
  //
  app.post('/api/trades/:tradeId/close', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const id = parseInt(req.params.tradeId);
      const trade = await db.query.trades.findFirst({
        where: eq(trades.id, id),
      });
      if (!trade || trade.userId !== req.user.id) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      const flaskRes = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await flaskRes.json();
      res.json(result);
    } catch (err) {
      console.error('[Proxy] POST close failed:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  //
  // 4) History → GET /api/trades/history
  //
  app.get('/api/trades/history', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const history = await db.query.trades.findMany({
        where: inArray(trades.status, ['Closed','FAILED']),
        orderBy: desc(trades.updatedAt),
      });
      res.json(history);
    } catch (err) {
      console.error('[Proxy] GET history failed:', err);
      res.status(500).json({ error: (err as Error).message });
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