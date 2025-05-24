import express, { Express, Request, Response } from 'express';
import fetch from 'node-fetch';
import { createServer, Server } from 'http';
import { setupAuth } from './auth';
import { db } from '@db';
import { trades } from '@db/schema';
import { eq, inArray, desc } from 'drizzle-orm';


// Legacy routers
import secondaryRateRouter   from './routes/secondary-rate';
import chatRouter            from './routes/chat';
import activtradesRouter     from './routes/activtrades-rate';
import tickmillRouter        from './routes/tickmill-rate';
import fbsRouter             from './routes/fbs-rate';
import paymentRouter         from './routes/payment';
import simulateRouter        from './routes/simulate';

const FLASK = process.env.FLASK_URL || 'http://3.145.164.47';

// 1. Define the JSON shapes
interface FlaskTrade {
  id:         number;
  symbol:     string;
  direction:  string;
  volume:     number;
  status:     'NEW'|'Executed'|'Closed'|'FAILED';
  metadata:   Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ActivTradesRate {
  bid: number;
  ask: number;
  swap_long: number;
  swap_short: number;
}


export function registerRoutes(app: Express): Server {
  // 1) Middleware
  app.use(express.json());
  setupAuth(app);

  // 2) Mount legacy routers
  app.use(secondaryRateRouter);
  app.use(chatRouter);
  app.use(activtradesRouter);
  app.use(tickmillRouter);
  app.use(fbsRouter);
  app.use(paymentRouter);
  app.use(simulateRouter);
  console.log(Object.keys(trades));
  // ─── New /api/trades endpoints ────────────────────────────────────

  // 1) Create a new trade
  app.post('/api/trades', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const { symbol, direction, volume, metadata = {} } = req.body;
      // Proxy to Flask
      const resp = await fetch(`${FLASK}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, direction, volume, status: 'NEW', metadata })
      });
      
      const ft = (await resp.json()) as FlaskTrade;

      const [dbEntry] = await db
      .insert(trades)
      .values({
        userId:       req.user.id,       // number
        flaskTradeId: ft.id,             // number
        symbol:       ft.symbol,         // string
        direction:    ft.direction,      // string
        volume:       ft.volume,         // number
        status:       ft.status,         // string ('NEW')
        metadata:     ft.metadata        // object for jsonb column
      })
      .returning();

      return res.status(resp.status).json(dbEntry);
    } catch (err) {
      console.error('Error creating trade:', err);
      return res.status(500).json({ error: 'Failed to create trade' });
    }
  });

  // 2) Poll a trade’s status
  app.get('/api/trades/:id/status', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const id = parseInt(req.params.id, 10);
      const t = await db.query.trades.findFirst({ where: eq(trades.id, id) });
      if (!t || t.userId !== req.user.id) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      const resp = await fetch(`${FLASK}/trades/${t.flaskTradeId}/status`);
      const { status } = await resp.json();

      // Map to UI labels and persist
      const labelMap: Record<string,string> = {
        NEW:      'Order sent',
        Executed: 'Order placed',
        Closed:   'Closed',
        FAILED:   'Failed'
      };
      await db.update(trades)
        .set({ status, updatedAt: new Date() })
        .where(eq(trades.id, id));

      return res.json({ status, label: labelMap[status] ?? status });
    } catch (err) {
      console.error('Error checking trade status:', err);
      return res.status(500).json({ error: 'Failed to check status' });
    }
  });

  // 3) Close a trade early
  app.post('/api/trades/:id/close', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const id = parseInt(req.params.id, 10);
      const t = await db.query.trades.findFirst({ where: eq(trades.id, id) });
      if (!t || t.userId !== req.user.id) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      const resp = await fetch(`${FLASK}/trades/${t.flaskTradeId}/close`, { method: 'POST' });
      const body = await resp.json();
      return res.status(resp.status).json(body);
    } catch (err) {
      console.error('Error closing trade:', err);
      return res.status(500).json({ error: 'Failed to close trade' });
    }
  });

  // 4) History tab
  app.get('/api/trades/history', async (_: Request, res: Response) => {
    if (!res.req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const hist = await db.query.trades.findMany({
        where: inArray(trades.status, ['Closed','FAILED']),
        orderBy: desc(trades.updatedAt)
      });
      return res.json(hist);
    } catch (err) {
      console.error('Error fetching trade history:', err);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // ─── Exchange rates endpoint ────────────────────────────────────────

  const SUPPORTED_SYMBOLS = ['USDBRL', 'EURUSD', 'USDMXN'];
  app.get('/api/xtb/rates', async (req, res) => {
    res.header('Content-Type', 'application/json');
    const rates = [];
    for (const symbol of SUPPORTED_SYMBOLS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(`http://localhost:${req.socket.localPort}/api/activtrades-rate?symbol=${symbol}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!r.ok) throw new Error(`Status ${r.status}`);
        const d = (await r.json()) as ActivTradesRate;
        rates.push({
          symbol,
          bid:        d.bid,
          ask:        d.ask,
          timestamp:  Date.now(),
          swapLong:   Math.abs(d.swap_long/10000||0),
          swapShort:  Math.abs(d.swap_short/10000||0)
        });
      } catch (e) {
        console.error(`Error fetching ${symbol}:`, e);
      }
    }
    if (!rates.length) {
      return res.status(503).json({ error: 'Exchange rate service unavailable' });
    }
    return res.json(rates);
  });

  return createServer(app);
}
