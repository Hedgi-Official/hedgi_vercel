// server/routes.ts
import fetch from 'node-fetch';
import { db } from '@db';
import { trades } from '@db/schema';        // ← import the real trades table
import { eq, desc, inArray } from 'drizzle-orm';
import type { Express, Request, Response } from 'express';
import { createServer, Server } from 'http';
import { setupAuth } from './auth';
import activtradesRouter from './routes/activtrades-rate';
import tickmillRouter from './routes/tickmill-rate';
import fbsRouter from './routes/fbs-rate';
import secondaryRateRouter from './routes/secondary-rate';
import chatRouter from './routes/chat';
import paymentRouter from './routes/payment';
// Import our modern trade service for the curl-based API implementation
import { tradeService } from "./services/tradeService";

const FLASK = process.env.FLASK_URL || 'http://3.145.164.47';
interface BrokerRate {
  bid:      number;
  ask:      number;
  swap_long:  number;
  swap_short: number;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);


  // 1) Create a new trade (Simple proxy to Flask)
  app.post('/api/trades', async (req: Request, res: Response) => {
    try {
      console.log('[Express Proxy] Forwarding trade request to Flask:', req.body);

      const flaskRes = await fetch(`${FLASK}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });

      console.log('[Express Proxy] Flask response status:', flaskRes.status);

      if (!flaskRes.ok) {
        const errorText = await flaskRes.text();
        console.error('[Express Proxy] Flask error:', errorText);
        return res.status(flaskRes.status).json({ error: errorText });
      }

      const result = await flaskRes.json();
      console.log('[Express Proxy] Flask success:', result);
      res.json(result);
    } catch (error) {
      console.error('[Express Proxy] Error:', error);
      res.status(500).json({ error: 'Proxy error: ' + error.message });
    }
  });


  // 2) Poll status
  app.get('/api/trades/:tradeId/status', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const t = await db.query.trades.findFirst({
        where: eq(trades.id, Number(req.params.tradeId))
      });
      if (!t || t.userId !== req.user.id) return res.status(404).json({ error: 'Trade not found' });

      const flaskRes = await fetch(`${FLASK}/trades/${t.flaskTradeId}/status`);
      const flaskStatus = (await flaskRes.json()) as { status: string, comment?: string };

      const statusMap: Record<string,string> = {
        NEW:       'Order sent',
        Executed:  'Order placed',
        Closed:    'Closed',
        FAILED:    'Failed',
      };

      // Update the database with the new status and set closedAt for completed trades
      const updateData: any = { 
        status: flaskStatus.status, 
        closedAt: new Date() 
      };

      // Set closedAt timestamp for completed trades
      if (['Closed', 'FAILED', 'closed', 'failed'].includes(flaskStatus.status)) {
        updateData.closedAt = flaskStatus.closedAt
      }

      await db.update(trades)
        .set(updateData)
        .where(eq(trades.id, t.id));

      console.log(`[Trade Status] Updated trade ${t.id} status to: ${flaskStatus.status}`);

      const response: any = { 
        status: flaskStatus.status, 
        label: statusMap[flaskStatus.status] ?? flaskStatus.status
      };

      // Only include closedAt if Flask provided it
      if (updateData.closedAt) {
        response.closedAt = updateData.closedAt.toLocaleString()
      }

      return res.json(response);
    } catch (err) {
      console.error('Error checking trade status:', err);
      return res.status(500).json({ error: 'Failed to check status' });
    }
  });

  // 3) Close early
  app.post('/api/trades/:tradeId/close', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      const t = await db.query.trades.findFirst({
        where: eq(trades.id, Number(req.params.tradeId))
      });
      if (!t || t.userId !== req.user.id) return res.status(404).json({ error: 'Trade not found' });

      const flaskRes = await fetch(`${FLASK}/trades/${t.flaskTradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await flaskRes.json();
      return res.json(result);
    } catch (err) {
      console.error('Error closing trade:', err);
      return res.status(500).json({ error: 'Failed to close trade' });
    }
  });

  // 4) History tab
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      console.log('[Express Proxy] Getting trade history from database');

      // Get all trades for this user
      const allTrades = await db.query.trades.findMany({
        where: eq(trades.userId, req.user.id),
        orderBy: desc(trades.updatedAt),
      });

      console.log(`[Express Proxy] Found trades in database: ${allTrades.length}`);

      for (const trade of allTrades) {
        if (trade.flaskTradeId) {
          try {
            // Check Flask status
            const flaskResponse = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`);
            if (flaskResponse.ok) {
              const flaskStatus = await flaskResponse.json();
              const statusLower = flaskStatus.status?.toLowerCase() || '';
              const isCompleted = ['failed', 'closed', 'executed', 'cancelled', 'completed'].includes(statusLower);

              console.log(`[Trade History] Trade ${trade.id} has Flask status: ${flaskStatus.status}${isCompleted ? ' (COMPLETED)' : ''}`);

              // Include completed trades in history
              if (isCompleted) {
                console.log(`[Trade History] Including completed trade ${trade.id} with status ${flaskStatus.status}`);

                // Parse closedAt from Flask's comment field if available
                let closedAtTimestamp;
                if (flaskStatus.comment && flaskStatus.comment.includes('closed at:')) {
                  const closedAtMatch = flaskStatus.comment.match(/closed at:\s*(.+)/);
                  if (closedAtMatch && closedAtMatch[1]) {
                    try {
                      closedAtTimestamp = new Date(closedAtMatch[1].trim()).toISOString();
                    } catch (err) {
                      console.warn(`[Trade History] Could not parse closedAt from comment: ${flaskStatus.comment}`);
                    }
                  }
                } else if (trade.closedAt) {
                  // Use previously stored closedAt timestamp
                  closedAtTimestamp = trade.closedAt.toISOString();
                }
                // If no closedAt available, leave it undefined for failed/incomplete trades

                const historyTrade: any = {
                  ...trade,
                  status: flaskStatus.status,
                  ticket: `FLASK-${trade.flaskTradeId}`,
                  symbol: trade.symbol || 'UNKNOWN',
                  volume: trade.volume?.toString() || '0.01',
                  openTime: trade.createdAt?.toISOString() || new Date().toISOString()
                };

                // Only include closedAt if we have a valid timestamp
                if (closedAtTimestamp) {
                  historyTrade.closedAt = closedAtTimestamp;
                }

                historyTrades.push(historyTrade);
              }
            }
          } catch (error) {
            console.error(`[Express Proxy] Error checking Flask status for trade ${trade.flaskTradeId}:`, error);
          }
        } else {
          // For non-Flask trades, use database status - include all completed trades
          if (['Closed', 'FAILED', 'closed', 'failed', 'completed', 'cancelled'].includes(trade.status || '')) {
            const historyTrade: any = {
              ...trade,
              ticket: trade.tradeOrderNumber || `DB-${trade.id}`,
              symbol: trade.symbol || 'UNKNOWN',
              volume: trade.volume?.toString() || '0.01',
              openTime: trade.createdAt?.toISOString() || new Date().toISOString()
            };

            // Only include closedAt if we have a valid timestamp from the database
            if (trade.closedAt) {
              historyTrade.closedAt = trade.closedAt.toISOString();
            }

            historyTrades.push(historyTrade);
          }
        }
      }

      console.log(`[Express Proxy] Returning ${historyTrades.length} completed trades`);
      return res.json(historyTrades);
    } catch (err) {
      console.error('Error fetching trade history:', err);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // … leave other unrelated routes (e.g. /api/xtb/rates) here …

  // Register routes
  app.use(secondaryRateRouter);
  app.use(chatRouter);
  app.use(activtradesRouter);
  app.use(tickmillRouter);
  app.use(fbsRouter);
  app.use(paymentRouter);
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

          const data = (await response.json()) as BrokerRate;
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

  return createServer(app);
}