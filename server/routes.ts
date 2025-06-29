// server/routes.ts
import fetch from 'node-fetch';
import { db } from '@db';
import { trades, users } from '@db/schema';        // ← import the real trades table and users
import { eq, desc, inArray, and} from 'drizzle-orm';
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

const FLASK = process.env.FLASK_URL;
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
      const flaskUrl = process.env.FLASK_URL;
      
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
      
      // Call Mercado Pago Payments API
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify(paymentData)
      });
      
      const mpResult = await mpResponse.json();
      console.log('[Process Payment] Mercado Pago response:', mpResult);
      
      if (mpResult.status === 'approved') {
        return res.json({
          id: mpResult.id,
          message: 'Payment processed',
          status: 'approved'
        });
      } else {
        return res.json({
          id: null,
          message: 'Payment failed',
          status: 'rejected',
          details: mpResult.status_detail || 'Payment not approved'
        });
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


  // 1) Create a new trade (Enhanced proxy to Flask with PIX key in metadata)
  app.post('/api/trades', async (req: Request, res: Response) => {
    // Check authentication
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userId = req.user.id;
      console.log('[Express Proxy] Creating trade for user:', userId);

      // Fetch user's PIX key from database
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          paymentIdentifier: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prepare the payload with PIX key in metadata
      const payload = {
        ...req.body,
        metadata: {
          ...req.body.metadata,
          pixKey: user.paymentIdentifier || null
        }
      };

      console.log('[Express Proxy] Forwarding trade request to Flask with metadata:', payload);

      const flaskRes = await fetch(`${FLASK}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  // 3) Close early - Secure endpoint requiring authentication
  app.post('/api/trades/:tradeId/close', async (req: Request, res: Response) => {
    console.log('[CLOSE ENDPOINT] Route hit - tradeId:', req.params.tradeId);
    console.log('[CLOSE ENDPOINT] Authentication check:', req.isAuthenticated());
    console.log('[CLOSE ENDPOINT] User:', req.user);
    
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log('[CLOSE ENDPOINT] Authentication failed');
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;
    
    try {
      const flaskTradeId = req.params.tradeId;
      console.log(`[CLOSE] User ${userId} closing Flask trade ${flaskTradeId}`);
      
      // Direct call to Flask close endpoint
      const flaskRes = await fetch(`${FLASK}/trades/${flaskTradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!flaskRes.ok) {
        const errorText = await flaskRes.text();
        console.error(`[CLOSE] Flask error for trade ${flaskTradeId}:`, errorText);
        return res.status(flaskRes.status).json({ error: errorText });
      }

      const result = await flaskRes.json();
      console.log(`[CLOSE] Successfully closed Flask trade ${flaskTradeId}`);
      return res.json(result);

    } catch (err) {
      console.error('[CLOSE] Error:', err);
      return res.status(500).json({ error: 'Failed to close trade' });
    }
  });

  // 3.5) Get trade spread info → GET /api/trades/:tradeId/spread (proxy to Flask)
  app.get('/api/trades/:tradeId/spread', async (req: Request, res: Response) => {
    console.log('[SPREAD ENDPOINT] Route hit - tradeId:', req.params.tradeId);
    console.log('[SPREAD ENDPOINT] Authentication check:', req.isAuthenticated());
    console.log('[SPREAD ENDPOINT] FLASK URL:', FLASK);
    
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log('[SPREAD ENDPOINT] Authentication failed');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const flaskTradeId = req.params.tradeId;
      const flaskUrl = `${FLASK}/trades/${flaskTradeId}/spread`;
      console.log(`[SPREAD] Fetching from URL: ${flaskUrl}`);
      
      // Direct call to Flask spread endpoint
      const flaskRes = await fetch(flaskUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json' 
        }
      });

      console.log(`[SPREAD] Flask response status: ${flaskRes.status}`);
      console.log(`[SPREAD] Flask response headers:`, Object.fromEntries(flaskRes.headers.entries()));

      if (!flaskRes.ok) {
        const errorText = await flaskRes.text();
        console.error(`[SPREAD] Flask error for trade ${flaskTradeId}:`, errorText);
        return res.status(flaskRes.status).json({ error: errorText });
      }

      const responseText = await flaskRes.text();
      console.log(`[SPREAD] Flask raw response:`, responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[SPREAD] Failed to parse JSON:`, parseError);
        return res.status(500).json({ error: 'Invalid response format from Flask' });
      }

      console.log(`[SPREAD] Successfully got spread data for Flask trade ${flaskTradeId}:`, result);
      res.setHeader('Content-Type', 'application/json');
      return res.json(result);

    } catch (err) {
      console.error('[SPREAD] Error:', err);
      return res.status(500).json({ error: 'Failed to get spread data' });
    }
  });

  // 4) History tab - returns ONLY ClosedTrade interface fields
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      console.log('[Express Proxy] Getting trade history from database');
      console.log('Cookies:', req.headers.cookie);

      // Get all trades for this user that have Flask IDs
      const allTrades = await db.query.trades.findMany({
        where: eq(trades.userId, req.user.id),
        orderBy: desc(trades.updatedAt),
      });

      console.log(`[Express Proxy] Found ${allTrades.length} trades total for user ${req.user.id}`);

      // Interface matching exactly what React expects
      interface ClosedTrade {
        id: number;
        ticket: string;
        symbol: string;
        volume: string;
        openTime: string;
        closedAt: string;
        status: string;
        direction?: string;
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
            direction?: string;
            current_value?: number;
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
            direction: flaskData.direction, // Include direction from Flask
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

  // Main GET /api/trades endpoint - returns active trades for dashboard
  app.get('/api/trades', async (req: Request, res: Response) => {
    console.log('[TRADES ENDPOINT] Route hit');
    console.log('[TRADES ENDPOINT] Authentication check:', req.isAuthenticated());
    console.log('[TRADES ENDPOINT] User:', req.user);
    
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log('[TRADES ENDPOINT] Authentication failed');
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;
    
    try {
      console.log('[Express Proxy] Getting active trades from database for user:', userId);

      // Get only trades for the current authenticated user
      const userTrades = await db.query.trades.findMany({
        where: eq(trades.userId, userId),
        orderBy: desc(trades.createdAt),
        limit: 100
      });

      console.log(`[Express Proxy] Found ${userTrades.length} trades for user ${userId}`);

      const activeTrades = [];
      const flaskPromises = [];

      // Batch Flask status requests for efficiency
      for (const trade of userTrades) {
        if (!trade.flaskTradeId) continue;

        flaskPromises.push(
          fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`)
            .then(response => response.ok ? response.json() : null)
            .then((flaskData: any) => {
              console.log(`[Express Proxy] Flask status for trade ${trade.id} (Flask ${trade.flaskTradeId}):`, flaskData);
              if (flaskData && flaskData.status && !['CLOSED', 'FAILED', 'closed', 'failed'].includes(flaskData.status)) {
                console.log(`[Express Proxy] Trade ${trade.id} status ${flaskData.status} - not completed`);
                return {
                  ...trade,
                  status: flaskData.status,
                  direction: flaskData.direction, // Include direction from Flask
                  current_value: flaskData.current_value, // Include current value if available
                  updatedAt: new Date().toISOString()
                };
              }
              return null;
            })
            .catch(error => {
              console.error(`[Express Proxy] Error checking Flask status for trade ${trade.id}:`, error);
              return null;
            })
        );

        // Limit Flask requests to 50
        if (flaskPromises.length >= 50) break;
      }

      // Wait for all Flask requests to complete
      const results = await Promise.all(flaskPromises);
      activeTrades.push(...results.filter(result => result !== null));

      console.log(`[Express Proxy] Found ${activeTrades.length} active trades for user ${userId}`);
      res.json(activeTrades);
    } catch (error) {
      console.error('[Express Proxy] Active trades error:', error);
      res.status(500).json({ error: 'Failed to fetch active trades' });
    }
  });

  // 1) Open trades → returns the simplified OpenTrade interface
  app.get('/api/trades/open', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    try {
      console.log(`[Express Proxy] Getting open trades for user ${req.user.id}`);
      const openTrades = await tradeService.getOpenTrades(req.user.id);
      console.log(`[Express Proxy] Found ${openTrades.length} open trades for user ${req.user.id}`);
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
      const flaskUrl = `https://boot-wilson-productivity-gsm.trycloudflare.com/brick?amount=${amount}`;
      
      console.log(`[Flask Proxy] Fetching brick from: ${flaskUrl}`);
      
      const response = await fetch(flaskUrl);
      const html = await response.text();
      
      console.log(`[Flask Proxy] Successfully fetched brick HTML (${html.length} characters)`);
      
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
          const timeoutId = setTimeout(() => controller.abort(), 12000);

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