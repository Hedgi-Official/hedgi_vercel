import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { trades } from "@db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import secondaryRateRouter from './routes/secondary-rate';
import chatRouter from './routes/chat';
import activtradesRouter from './routes/activtrades-rate';
import tickmillRouter from './routes/tickmill-rate';
import fbsRouter from './routes/fbs-rate';
import paymentRouter from './routes/payment';
import simulateRouter from './routes/simulate';

const FLASK = process.env.FLASK_URL || 'http://3.145.164.47';

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register routes
  app.use(secondaryRateRouter);
  app.use(chatRouter);
  app.use(activtradesRouter);
  app.use(tickmillRouter);
  app.use(fbsRouter);
  app.use(paymentRouter);
  app.use(simulateRouter);

  // New Trades API - Flask Backend Integration
  
  // 1) Create a new trade → POST /api/trades
  app.post('/api/trades', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const { symbol, direction, volume, metadata } = req.body;
      
      const tradeData = {
        symbol,
        direction,
        volume,
        status: 'NEW',
        metadata: metadata || {}
      };

      const response = await fetch(`${FLASK}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });

      const flaskTrade = await response.json();
      
      // Store trade info using new schema structure
      const dbTrade = await db.insert(trades).values({
        userId: req.user.id,
        flaskTradeId: flaskTrade.id,
        symbol: symbol,
        direction: direction,
        volume: volume.toString(),
        status: 'NEW',
        metadata: JSON.stringify(metadata || {})
      }).returning();

      res.json({
        id: dbTrade[0].id,
        symbol,
        direction,
        volume,
        status: 'NEW',
        flaskTradeId: flaskTrade.id
      });
    } catch (error) {
      console.error('Error creating trade:', error);
      res.status(500).json({ error: 'Failed to create trade' });
    }
  });

  // 2) Poll a trade's status → GET /api/trades/:id/status
  app.get('/api/trades/:id/status', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const trade = await db.query.trades.findFirst({
        where: eq(trades.id, parseInt(req.params.id))
      });

      if (!trade || trade.userId !== req.user.id) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      const response = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`);
      const { status } = await response.json();

      // Map status to UI labels
      const statusMap: Record<string, string> = {
        'NEW': 'Order sent',
        'Executed': 'Order placed',
        'Closed': 'Closed',
        'FAILED': 'Failed'
      };

      // Update local DB status
      await db.update(trades)
        .set({ status: status === 'Closed' ? 'closed_by_sl' : 'open' })
        .where(eq(trades.id, trade.id));

      res.json({ 
        status, 
        label: statusMap[status] || status 
      });
    } catch (error) {
      console.error('Error checking trade status:', error);
      res.status(500).json({ error: 'Failed to check status' });
    }
  });

  // 3) Close a trade early → POST /api/trades/:id/close
  app.post('/api/trades/:id/close', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const trade = await db.query.trades.findFirst({
        where: eq(trades.id, parseInt(req.params.id))
      });

      if (!trade || trade.userId !== req.user.id) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      const response = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      // Update local DB to mark as closed
      await db.update(trades)
        .set({ status: 'Closed', updatedAt: new Date() })
        .where(eq(trades.id, trade.id));

      res.json(result);
    } catch (error) {
      console.error('Error closing trade:', error);
      res.status(500).json({ error: 'Failed to close trade' });
    }
  });

  // 4) History tab → GET /api/trades/history
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const historyTrades = await db.query.trades.findMany({
        where: inArray(trades.status, ['Closed', 'FAILED']),
        orderBy: desc(trades.createdAt)
      });

      res.json(historyTrades);
    } catch (error) {
      console.error('Error fetching trade history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // Get open trades endpoint
  app.get('/api/trades/open', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const openTrades = await db.query.trades.findMany({
        where: inArray(trades.status, ['NEW', 'Executed', 'open']),
        orderBy: desc(trades.createdAt)
      });

      res.json(openTrades);
    } catch (error) {
      console.error('Error fetching open trades:', error);
      res.status(500).json({ error: 'Failed to fetch open trades' });
    }
  });

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





  const httpServer = createServer(app);
  return httpServer;
}
 