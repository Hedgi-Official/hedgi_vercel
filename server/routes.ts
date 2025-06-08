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
import { PAYMENT_CONFIG } from "./config";
import { paymentService } from "./services/paymentService";
import { readFileSync } from 'fs';
import { join } from 'path';

const FLASK = process.env.FLASK_URL || 'http://3.145.164.47';

// Cache for payment results to enable polling
const paymentResultsCache = new Map<string, any>();

interface BrokerRate {
  bid:      number;
  ask:      number;
  swap_long:  number;
  swap_short: number;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Mercado Pago API endpoints for modal popup
  app.get('/api/mp-public-key', async (req: Request, res: Response) => {
    try {
      const publicKey = PAYMENT_CONFIG.BR_PUBLIC_KEY;
      if (!publicKey) {
        return res.status(500).json({ error: 'Mercado Pago public key not configured' });
      }
      res.json({ publicKey });
    } catch (error) {
      console.error('Error getting MP public key:', error);
      res.status(500).json({ error: 'Failed to get public key' });
    }
  });

  app.post('/api/payment-preference', async (req: Request, res: Response) => {
    try {
      const { amount, hedgeData } = req.body;
      
      const preference = {
        id: `hedge_${Date.now()}`,
        amount: parseFloat(amount),
        currency_id: 'BRL',
        description: `Hedge ${hedgeData.baseCurrency}/${hedgeData.targetCurrency}`,
        metadata: hedgeData
      };
      
      res.json(preference);
    } catch (error) {
      console.error('Error creating payment preference:', error);
      res.status(500).json({ error: 'Failed to create payment preference' });
    }
  });

  app.post('/api/process-payment', async (req: Request, res: Response) => {
    try {
      const { hedgeData, amount, ...paymentData } = req.body;
      
      console.log('[MP Process Payment] Processing payment for amount:', amount);
      
      const mpResult = await paymentService.processPayment({
        token: paymentData.token,
        transaction_amount: parseFloat(amount),
        description: `Hedge ${hedgeData.baseCurrency}/${hedgeData.targetCurrency}`,
        payment_method_id: paymentData.payment_method_id,
        payer: paymentData.payer,
        metadata: {
          days: hedgeData.duration,
          margin: hedgeData.margin || '0',
          baseCurrency: hedgeData.baseCurrency,
          targetCurrency: hedgeData.targetCurrency,
          tradeDirection: hedgeData.tradeDirection,
          rate: hedgeData.rate,
          amount: hedgeData.amount
        }
      });

      if (mpResult && (mpResult as any).status === 'approved') {
        const paymentResult = {
          id: (mpResult as any).id,
          status: 'approved',
          message: 'Payment processed successfully'
        };
        res.json(paymentResult);
      } else {
        res.status(400).json({ 
          error: 'Payment not approved', 
          status: (mpResult as any)?.status || 'unknown' 
        });
      }
    } catch (error: unknown) {
      console.error('[MP Process Payment] Error:', error);
      res.status(500).json({ 
        error: 'Payment processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Flask brick proxy endpoint - using specific route that Vite won't intercept
  app.get('/flask-brick-proxy', async (req: Request, res: Response) => {
    try {
      const { amount, hedgeData } = req.query;
      
      console.log('[Flask Brick Proxy] Request:', { amount, hedgeData });
      
      // Get Flask URL from environment (keeping it secure)
      const flaskUrl = process.env.FLASK_URL || 'http://3.145.164.47';
      
      // Forward request to Flask /brick endpoint with just amount parameter
      const brickUrl = `${flaskUrl}/brick?amount=${amount}`;
      console.log('[Flask Brick Proxy] Fetching from:', brickUrl);
      
      const brickResponse = await fetch(brickUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Hedgi-Proxy/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      console.log('[Flask Brick Proxy] Response status:', brickResponse.status);
      
      if (!brickResponse.ok) {
        throw new Error(`Flask brick endpoint returned ${brickResponse.status}: ${brickResponse.statusText}`);
      }
      
      let html = await brickResponse.text();
      console.log('[Flask Brick Proxy] HTML length:', html.length);
      
      // Inject message passing code to communicate payment results back to parent
      const messageScript = `
        <script>
          // Override any payment completion functions to send messages to parent
          window.notifyPaymentSuccess = function(paymentResult) {
            window.parent.postMessage({
              type: 'PAYMENT_SUCCESS',
              paymentResult: paymentResult
            }, '*');
          };
          
          window.notifyPaymentError = function(error) {
            window.parent.postMessage({
              type: 'PAYMENT_ERROR',
              error: error
            }, '*');
          };
          
          window.notifyPaymentProcessing = function() {
            window.parent.postMessage({
              type: 'PAYMENT_PROCESSING'
            }, '*');
          };
          
          // Override console.log to capture payment completion
          const originalLog = console.log;
          console.log = function(...args) {
            originalLog.apply(console, args);
            
            // Look for payment completion patterns
            const message = args.join(' ');
            if (message.includes('Payment') && message.includes('approved')) {
              try {
                const paymentData = JSON.parse(message);
                if (paymentData.status === 'approved') {
                  window.notifyPaymentSuccess(paymentData);
                }
              } catch (e) {
                // If not JSON, look for payment ID patterns
                const idMatch = message.match(/id[":]+([0-9]+)/);
                if (idMatch) {
                  window.notifyPaymentSuccess({
                    id: idMatch[1],
                    status: 'approved',
                    message: 'Payment processed successfully'
                  });
                }
              }
            }
          };
        </script>
      `;
      
      // Inject the script before closing </body> tag
      html = html.replace('</body>', `${messageScript}</body>`);
      
      // Set proper headers to prevent iframe restrictions
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
      res.send(html);
    } catch (error) {
      console.error('Flask brick proxy error:', error);
      res.status(500).send(`
        <html>
          <body>
            <div style="padding: 20px; text-align: center;">
              <h3>Payment Form Error</h3>
              <p>Failed to load payment form from Flask server</p>
              <p>Error: ${error.message}</p>
              <button onclick="window.parent.postMessage({type: 'PAYMENT_ERROR', error: 'Failed to load payment form'}, '*')">Close</button>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Mercado Pago Brick Integration Endpoints
  
  // 1. GET /payment?amount=<AMOUNT> - Renders payment form with cardPayment Brick
  app.get('/payment', (req: Request, res: Response) => {
    const amount = req.query.amount as string;
    const publicKey = process.env.MP_BR_PUBLIC_KEY;
    
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).send('Invalid amount parameter');
    }
    
    if (!publicKey) {
      return res.status(500).send('Payment system not configured');
    }
    
    try {
      const template = readFileSync(join(__dirname, 'templates/payment.html'), 'utf8');
      const html = template
        .replace(/{{AMOUNT}}/g, amount)
        .replace(/{{PUBLIC_KEY}}/g, publicKey);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error rendering payment template:', error);
      res.status(500).send('Error loading payment page');
    }
  });

  // 2. POST /process_payment - Processes payment via Mercado Pago API
  app.post('/process_payment', async (req: Request, res: Response) => {
    try {
      const paymentData = req.body;
      const accessToken = process.env.MP_BR_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(500).json({ 
          error: 'Payment system not configured',
          status: 'error' 
        });
      }
      
      console.log('[Process Payment] Received payment data:', paymentData);
      
      // Generate txId for caching (don't send to MercadoPago)
      const txId = paymentData.txId || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove custom fields before sending to MercadoPago
      const { txId: _, ...mpPaymentData } = paymentData;
      
      // Call Mercado Pago Payments API with clean data
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify(mpPaymentData)
      });
      
      const mpResult = await mpResponse.json();
      console.log('[Process Payment] Mercado Pago response:', mpResult);
      
      if (mpResult.status === 'approved') {
        const approvedResult = {
          id: mpResult.id,
          message: 'Payment processed',
          status: 'approved',
          txId: txId,
          timestamp: Date.now()
        };
        
        // Store payment result for polling
        paymentResultsCache.set(txId, approvedResult);
        console.log(`[Process Payment] Stored approved payment result for txId ${txId}:`, approvedResult);
        
        return res.json(approvedResult);
      } else {
        const rejectedResult = {
          id: null,
          message: 'Payment failed',
          status: 'rejected',
          details: mpResult.status_detail || 'Payment not approved',
          txId: txId,
          timestamp: Date.now()
        };
        
        // Store payment result for polling
        paymentResultsCache.set(txId, rejectedResult);
        console.log(`[Process Payment] Stored rejected payment result for txId ${txId}:`, rejectedResult);
        
        return res.json(rejectedResult);
      }
    } catch (error) {
      console.error('[Process Payment] Error:', error);
      res.status(500).json({
        error: 'Payment processing failed',
        status: 'error'
      });
    }
  });

  // 3. GET /payment_status/<payment_id> - Shows status with statusScreen Brick
  app.get('/payment_status/:paymentId', (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const publicKey = process.env.MP_BR_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(500).send('Payment system not configured');
    }
    
    const isFailure = paymentId === 'failure';
    
    try {
      const template = readFileSync(join(__dirname, 'templates/payment_status.html'), 'utf8');
      
      if (isFailure) {
        const html = template
          .replace(/{{#if isFailure}}/g, '')
          .replace(/{{#unless isFailure}}[\s\S]*{{\/unless}}/g, '')
          .replace(/{{\/if}}/g, '')
          .replace(/{{AMOUNT}}/g, req.query.amount as string || '100')
          .replace(/{{PUBLIC_KEY}}/g, publicKey);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        const html = template
          .replace(/{{#if isFailure}}[\s\S]*{{\/if}}/g, '')
          .replace(/{{#unless isFailure}}/g, '')
          .replace(/{{\/unless}}/g, '')
          .replace(/{{PAYMENT_ID}}/g, paymentId)
          .replace(/{{PUBLIC_KEY}}/g, publicKey)
          .replace(/{{SYMBOL}}/g, 'USDBRL')
          .replace(/{{VOLUME}}/g, '0.1')
          .replace(/{{DIRECTION}}/g, 'buy')
          .replace(/{{DAYS}}/g, '7')
          .replace(/{{MARGIN}}/g, '500');
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      }
    } catch (error) {
      console.error('Error rendering payment status template:', error);
      res.status(500).send('Error loading payment status page');
    }
  });

  // Test endpoint to simulate successful payment (for development)
  app.post("/api/test/approve-payment", async (req: Request, res: Response) => {
    const { txId } = req.body;
    if (!txId) {
      return res.status(400).json({ error: "txId required" });
    }
    
    const approvedResult = {
      id: `mp_payment_${Date.now()}`,
      message: 'Payment processed (test)',
      status: 'approved',
      txId: txId,
      timestamp: Date.now()
    };
    
    paymentResultsCache.set(txId, approvedResult);
    console.log(`[Test] Stored approved payment result for txId ${txId}:`, approvedResult);
    
    res.json({ success: true, result: approvedResult });
  });

  // Payment status endpoint for polling
  app.get("/api/payment-status/:txId", async (req: Request, res: Response) => {
    try {
      const { txId } = req.params;
      console.log(`[Payment Status] Checking status for txId: ${txId}`);
      
      // Check if payment result is cached (from payment processing)
      const cachedResult = paymentResultsCache.get(txId);
      if (cachedResult) {
        console.log(`[Payment Status] Found cached result for ${txId}:`, cachedResult);
        res.json(cachedResult);
      } else {
        console.log(`[Payment Status] No cached result for ${txId}, returning pending`);
        res.json({
          status: "pending",
          message: "Payment verification in progress",
          txId: txId
        });
      }
    } catch (error) {
      console.error("[Payment Status] Error checking payment status:", error);
      res.status(500).json({
        status: "error",
        error: "Unable to check payment status"
      });
    }
  });

  // 1) Create a new trade (Save to both Flask and local database)
  app.post('/api/trades', async (req: Request, res: Response) => {
    // Use authenticated user ID or fallback to user 2 for testing
    const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 2;

    try {
      console.log('[Express Proxy] Creating trade for user', userId, 'with data:', req.body);

      // Forward to Flask first
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

      const flaskResult = await flaskRes.json();
      console.log('[Express Proxy] Flask success:', flaskResult);

      // Save to SQLite database using Drizzle ORM
      const { symbol, direction, volume, metadata } = req.body;
      const currentTime = new Date().toISOString();
      
      let savedTrade = null;
      try {
        // Create new trade record in SQLite
        const newTrade = {
          userId: Number(userId),
          ticket: `FLASK-${(flaskResult as any).id || Date.now()}`,
          broker: metadata?.broker || 'flask',
          volume: Number(volume || 1.0),
          symbol: symbol || 'USDBRL',
          openTime: currentTime,
          durationDays: Number(metadata?.days || 30),
          status: 'open' as const,
          flaskTradeId: Number((flaskResult as any).id),
          metadata: JSON.stringify(metadata || {}),
          enableRLS: false
        };

        console.log('[Express Proxy] Inserting trade:', newTrade);

        // Insert using Drizzle ORM
        const [insertedTrade] = await db.insert(trades).values(newTrade).returning();
        savedTrade = insertedTrade;
        
        console.log('[Express Proxy] Saved trade to SQLite database:', savedTrade);
      } catch (dbError: any) {
        console.error('[Express Proxy] Failed to save to SQLite database:', dbError);
        console.log('[Express Proxy] Database error details:', {
          message: dbError?.message,
          stack: dbError?.stack
        });
        // Continue without failing the entire request
      }

      res.json({
        ...flaskResult,
        localId: savedTrade?.id || null,
        saved: !!savedTrade
      });
    } catch (error) {
      console.error('[Express Proxy] Error:', error);
      res.status(500).json({ error: 'Proxy error: ' + error.message });
    }
  });

  // Active trades endpoint - returns trades that should be displayed in active section
  app.get('/api/trades', async (req: Request, res: Response) => {
    // Use authenticated user ID or fallback to user 2 for testing
    const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 2;
    try {
      console.log(`[Express Proxy] Getting active trades for user ${userId}`);

      // Get all trades for this user that have Flask IDs
      const allTrades = await db.query.trades.findMany({
        where: eq(trades.userId, userId),
        orderBy: desc(trades.updatedAt),
      });

      console.log(`[Express Proxy] Found ${allTrades.length} trades total for user ${userId}`);

      const activeTrades = [];

      for (const trade of allTrades) {
        // Skip trades without Flask IDs
        if (!trade.flaskTradeId) {
          console.log(`[Express Proxy] Skipping trade ${trade.id} - no Flask ID`);
          continue;
        }

        try {
          // Get current status from Flask
          const flaskRes = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`);
          if (!flaskRes.ok) {
            console.log(`[Express Proxy] Failed to fetch Flask status for trade ${trade.id}`);
            continue;
          }

          const flaskData = await flaskRes.json() as {
            status: string;
            closedAt?: string;
          };

          console.log(`[Express Proxy] Flask status for trade ${trade.id}: ${flaskData.status}`);

          // Include trades that are NOT completed (show pending, new, executing trades)
          const isCompleted = ['failed','closed','executed','cancelled','completed']
            .includes(flaskData.status.toLowerCase());

          if (!isCompleted) {
            // Format trade for active trades display
            activeTrades.push({
              id: trade.id,
              flaskTradeId: trade.flaskTradeId,
              ticket: trade.ticket,
              symbol: trade.symbol,
              volume: trade.volume,
              openTime: trade.openTime,
              durationDays: trade.durationDays,
              status: flaskData.status,
              metadata: JSON.parse(trade.metadata || '{}'),
              broker: trade.broker
            });
          } else {
            console.log(`[Express Proxy] Skipping completed trade ${trade.id} with status: ${flaskData.status}`);
          }
        } catch (err) {
          console.error(`[Express Proxy] Error checking status for trade ${trade.id}:`, err);
          // Include trade with database status if Flask check fails
          activeTrades.push({
            id: trade.id,
            flaskTradeId: trade.flaskTradeId,
            ticket: trade.ticket,
            symbol: trade.symbol,
            volume: trade.volume,
            openTime: trade.openTime,
            durationDays: trade.durationDays,
            status: trade.status,
            metadata: JSON.parse(trade.metadata || '{}'),
            broker: trade.broker
          });
        }
      }

      console.log(`[Express Proxy] Returning ${activeTrades.length} active trades for user ${userId}`);
      return res.json(activeTrades);
    } catch (err) {
      console.error('Error fetching active trades:', err);
      return res.status(500).json({ error: 'Failed to fetch active trades' });
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
      const flaskStatus = (await flaskRes.json()) as { status: string, closedAt?: string };

      const statusMap: Record<string,string> = {
        NEW:       'Order sent',
        Executed:  'Order placed',
        Closed:    'Closed',
        FAILED:    'Failed',
      };

      // Update the database with the new status and closedAt from Flask
      const updateData: any = { 
        status: flaskStatus.status, 
        updatedAt: new Date()
      };

      // Use closedAt from Flask if provided
      if (flaskStatus.closedAt) {
        updateData.closedAt = new Date(flaskStatus.closedAt);
      }

      await db.update(trades)
        .set(updateData)
        .where(eq(trades.id, t.id));

      console.log(`[Trade Status] Updated trade ${t.id} status to: ${flaskStatus.status}`);

      const response: any = { 
        status: flaskStatus.status, 
        label: statusMap[flaskStatus.status] ?? flaskStatus.status
      };

      // Include closedAt from Flask if provided
      if (flaskStatus.closedAt) {
        response.closedAt = flaskStatus.closedAt;
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

  // 4) History tab - returns ONLY ClosedTrade interface fields
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    // Use authenticated user ID or fallback to user 2 for testing
    const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 2;
    try {
      console.log('[Express Proxy] Getting trade history from database');

      // Get all trades for this user that have Flask IDs
      const allTrades = await db.query.trades.findMany({
        where: eq(trades.userId, userId),
        orderBy: desc(trades.updatedAt),
      });

      console.log(`[Express Proxy] Found ${allTrades.length} trades total for user ${userId}`);

      // Interface matching exactly what React expects
      interface ClosedTrade {
        id: number;
        ticket: string;
        symbol: string;
        volume: string;
        openTime: string;
        closedAt: string;
        status: string;
      }

      const historyTrades: ClosedTrade[] = [];

      for (const trade of allTrades) {
        // Skip trades without Flask IDs - we only get status from Flask
        if (!trade.flaskTradeId) {
          console.log(`[Express Proxy] Skipping trade ${trade.id} - no Flask ID`);
          continue;
        }

        try {
          // 1) Get current status from Flask (NEVER use database status)
          const flaskRes = await fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`);
          if (!flaskRes.ok) {
            console.log(`[Express Proxy] Failed to fetch Flask status for trade ${trade.id}`);
            continue;
          }

          const flaskData = await flaskRes.json() as {
            status: string;
            closedAt?: string;
          };

          console.log(`[Express Proxy] Flask status for trade ${trade.id}: ${flaskData.status}`);

          // 2) Only include completed trades in history
          const isCompleted = ['failed','closed','executed','cancelled','completed']
            .includes(flaskData.status.toLowerCase());

          if (!isCompleted) {
            console.log(`[Express Proxy] Skipping active trade ${trade.id} with status: ${flaskData.status}`);
            continue;
          }
          await db.update(trades)
          .set({
              status: flaskData.status, 
              closedAt: flaskData.closedAt ? new Date(flaskData.closedAt) : null,
              updatedAt: new Date() // Update the timestamp
          })
          .where(eq(trades.id, trade.id));

          // 3) Create clean ClosedTrade object with ONLY required fields
          const closedTrade: ClosedTrade = {
            id: trade.id,
            ticket: `FLASK-${trade.flaskTradeId}`,
            symbol: trade.symbol,
            volume: trade.volume?.toString() || '0.01',
            openTime: trade.createdAt.toISOString(),
            status: flaskData.status,  // Always from Flask
            closedAt: flaskData.closedAt || new Date().toISOString()  // Flask date or current time
          };

          historyTrades.push(closedTrade);
          console.log(`[Express Proxy] Added completed trade ${trade.id} to history`);

        } catch (err) {
          console.error(`[Express Proxy] Error processing trade ${trade.id}:`, err);
        }
      }

      console.log(`[Express Proxy] Returning ${historyTrades.length} completed trades for history`);
      return res.json(historyTrades);
    } catch (err) {
      console.error('Error fetching trade history:', err);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // 1) Open trades → returns the simplified OpenTrade interface
  app.get('/api/trades/open', async (req: Request, res: Response) => {
    // Use authenticated user ID or fallback to user 2 for testing
    const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 2;
    try {
      console.log(`[Express Proxy] Getting open trades for user ${userId}`);
      const openTrades = await tradeService.getOpenTrades(userId);
      console.log(`[Express Proxy] Found ${openTrades.length} open trades for user ${userId}`);
      return res.json(openTrades);
    } catch (err) {
      console.error('Error fetching open trades:', err);
      return res.status(500).json({ error: 'Failed to fetch open trades' });
    }
  });

  // … leave other unrelated routes (e.g. /api/xtb/rates) here …

  // Proxy endpoint for Flask brick to avoid CORS issues
  app.get("/api/proxy/brick", async (req: Request, res: Response) => {
    try {
      const amount = req.query.amount || 415;
      const txId = req.query.txId || "";
      const lang = req.query.lang || "en-US";
      
      const flaskUrl = `https://electoral-fuzzy-divorce-proc.trycloudflare.com/brick?amount=${amount}&txId=${txId}&lang=${lang}`;
      
      console.log(`[Flask Proxy] Fetching brick from: ${flaskUrl}`);
      console.log(`[Flask Proxy] Parameters: amount=${amount}, txId=${txId}, lang=${lang}`);
      
      const response = await fetch(flaskUrl);
      let html = await response.text();
      
      console.log(`[Flask Proxy] Successfully fetched brick HTML (${html.length} characters)`);
      
      // Fix the payment method ID extraction in the Flask template
      html = html.replace(
        'onSubmit: async cardFormData => {',
        'onSubmit: async ({ selectedPaymentMethod, formData }) => {'
      );
      
      html = html.replace(
        'payment_method_id: cardFormData.paymentMethodId,',
        'payment_method_id: selectedPaymentMethod,'
      );
      
      html = html.replace(
        /cardFormData\./g,
        'formData.'
      );
      
      // Add debugging to see what MercadoPago actually provides
      html = html.replace(
        'onSubmit: async ({ selectedPaymentMethod, formData }) => {',
        `onSubmit: async ({ selectedPaymentMethod, formData }) => {
            console.log("[DEBUG] onSubmit called with:", { selectedPaymentMethod, formData });
            console.log("[DEBUG] selectedPaymentMethod:", selectedPaymentMethod);
            console.log("[DEBUG] formData keys:", Object.keys(formData || {}));`
      );
      
      // Also add fallback for payment method detection
      html = html.replace(
        'payment_method_id: selectedPaymentMethod,',
        `payment_method_id: selectedPaymentMethod || formData.payment_method_id || formData.paymentMethodId || "visa",`
      );
      
      console.log(`[Flask Proxy] Fixed payment method ID extraction in template`);
      
      // Set proper headers for iframe embedding
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.send(html);
    } catch (error) {
      console.error('[Flask Proxy] Error fetching brick:', error);
      res.status(500).send(`
        <html>
          <body>
            <div style="padding: 20px; text-align: center; color: #666;">
              <h3>Payment form temporarily unavailable</h3>
              <p>Please try again in a moment.</p>
              <script>
                window.parent.postMessage({ status: 'error', error: 'Payment form unavailable' }, "*");
              </script>
            </div>
          </body>
        </html>
      `);
    }
  });

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