import fetch from 'node-fetch';
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
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return buf.toString("hex") === hashedPassword;
  },
};

const FLASK = process.env.FLASK_URL || "http://3.145.164.47";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Local Mercado Pago brick endpoint to avoid CORS issues
  app.get("/api/proxy/brick", async (req: Request, res: Response) => {
    try {
      // 1) Read both amount and txId from the query string
      const amount = req.query.amount || 415;
      const txId   = req.query.txId   || "";  // will be a UUID set by React

      console.log(`[Local Brick] /api/proxy/brick endpoint called`);
      console.log(`[Local Brick] Creating Mercado Pago brick for amount=${amount}, txId=${txId}`);

      // 2) Forward both to Flask’s /brick endpoint
      //    Flask’s home() route will extract `amount` and `txId` and render them into the HTML.
      const cacheBuster = Date.now();
      const flaskUrl = `http://3.145.164.47/brick?amount=${amount}&txId=${txId}&_cb=${cacheBuster}`;
      console.log(`[Flask Proxy] Fetching brick from: ${flaskUrl}`);

      const response = await fetch(flaskUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Hedgi-Proxy/1.0)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          "Connection": "keep-alive",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });

      if (!response.ok) {
        throw new Error(`Flask server responded with ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`[Local Brick] Generated brick HTML (${html.length} chars)`);

      // Fix the HTML template to use proper destructuring and include payment_method_id
      let updatedHtml = html.replace(
        /fetch\(['"`]\/process_payment['"`]/g,
        `fetch('/api/proxy/process_payment'`
      );

      // Replace the onSubmit callback to use proper destructuring
      updatedHtml = updatedHtml.replace(
        /onSubmit:\s*async\s*\(\s*cardFormData\s*\)\s*=>/,
        'onSubmit: async ({ selectedPaymentMethod, formData }) =>'
      );

      // Update the payload construction to use selectedPaymentMethod.id
      updatedHtml = updatedHtml.replace(
        /const paymentMethodId = cardFormData\.paymentMethodId;/,
        'const paymentMethodId = selectedPaymentMethod.id;'
      );

      // Fix the transaction_amount reference
      updatedHtml = updatedHtml.replace(
        /cardFormData\.transaction_amount/g,
        'formData.transaction_amount'
      );

      // Fix other formData references
      updatedHtml = updatedHtml.replace(
        /cardFormData\./g,
        'formData.'
      );

      // Fix the console.log reference to use the correct parameter
      updatedHtml = updatedHtml.replace(
        /console\.log\([^,]+,\s*cardFormData\)/g,
        'console.log("[iframe] onSubmit, received:", { selectedPaymentMethod, formData })'
      );

      // 3) Return it as HTML so the iframe can render it
      res.setHeader("Content-Type", "text/html");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.send(updatedHtml);
    } catch (error) {
      console.error("[Local Brick] Error creating brick:", error);
      res.status(500).send(`
        <html>
          <body>
            <div style="padding:20px; text-align:center; color:#666;">
              <h3>Payment form temporarily unavailable</h3>
              <p>Please try again in a moment.</p>
              <script>
                window.parent.postMessage(
                  { status: "error", error: "Payment form unavailable" },
                  "*"
                );
              </script>
            </div>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/proxy/process_payment", async (req: Request, res: Response) => {
    try {
      console.log("[Proxy] /api/proxy/process_payment endpoint called!");
      console.log("[Proxy] Request headers:", req.headers);
      console.log("[Proxy] Request method:", req.method);
      console.log("[Proxy] Request URL:", req.url);
      
      // 1) The request body is a JSON object containing:
      //    { token, installments, paymentMethodId, transactionAmount, payer:{…}, amount, txId }
      const originalPayload = req.body;
      console.log("[Proxy] Received payload:", JSON.stringify(originalPayload, null, 2));

      // Transform payload to match Flask's expected format
      const payload = {
        token: originalPayload.token,
        installments: originalPayload.installments || 1,
        payment_method_id: originalPayload.paymentMethodId || originalPayload.payment_method_id || "master",
        transaction_amount: originalPayload.transaction_amount || originalPayload.transactionAmount || originalPayload.amount,
        description: `Hedgi order for ${originalPayload.transaction_amount || originalPayload.transactionAmount || originalPayload.amount}`,
        payer: {
          email: originalPayload.payer?.email,
          identification: originalPayload.payer?.identification,
          first_name: originalPayload.payer?.first_name || "HedgiCustomer"
        },
        txId: originalPayload.txId
      };

      // Log missing fields for debugging
      if (!originalPayload.paymentMethodId && !originalPayload.payment_method_id) {
        console.log("[Proxy] WARNING: payment_method_id missing from payload, using fallback 'master'");
      }

      console.log("[Proxy] Transformed payload for Flask:", payload);

      // 2) Forward it directly to Flask’s /process_payment
      const flaskUrl = `http://3.145.164.47/process_payment`;
      console.log(`[Proxy] Forwarding to Flask: ${flaskUrl}`);

      const response = await fetch(flaskUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 3) Read Flask’s JSON response (e.g. { status:"approved", id:"abc123", message:"…" })
      const data = await response.json();

      // Always return status 200 to iframe, let iframe handle success/error based on data.status
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Error proxying payment:", error);
      res.json({ 
        status: "error", 
        error: "Payment processing failed",
        txId: req.body?.txId || ""
      });
    }
  });


  // Working registration endpoint that bypasses schema conflicts
  app.post("/signup", async (req: Request, res: Response) => {
    try {
      const { fullName, email, username, password, phoneNumber, nation, paymentIdentifier } = req.body;

      // Basic validation
      if (!fullName || !email || !username || !password || !nation || !paymentIdentifier) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Use Drizzle ORM for database operations
      const { db } = await import('../db/index.js');
      const { users } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Insert new user using Drizzle ORM
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          fullName,
          phoneNumber: phoneNumber || null,
          password: hashedPassword,
          nation,
          paymentIdentifier,
          googleCalendarEnabled: false,
          googleRefreshToken: null,
        })
        .returning();

      return res.json({
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          phoneNumber: newUser.phoneNumber,
          nation: newUser.nation,
          paymentIdentifier: newUser.paymentIdentifier,
        },
      });

    } catch (error: any) {
      console.error("Account creation error:", error);
      res.status(500).json({ message: "Registration failed: " + error.message });
    }
  });

  // Register existing routes
  app.use(secondaryRateRouter);
  app.use(chatRouter);
  app.use(activtradesRouter);
  app.use(tickmillRouter);
  app.use(fbsRouter);
  // app.use(paymentRouter); // Removed - using payment routes from server/index.ts instead
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const tradeId = req.params.tradeId;
      console.log(`[Express Proxy] Checking trade status for ID: ${tradeId}, user: ${req.user.id}`);

      // Find the trade record by ID and ensure it belongs to the current user
      const trade = await db.query.trades.findFirst({
        where: (t, { eq, and }) => and(
          eq(t.id, Number(tradeId)),
          eq(t.userId, req.user.id)
        )
      });

      if (!trade) {
        console.log(`[Express Proxy] Trade ${tradeId} not found for user ${req.user.id}`);
        return res.status(404).json({ error: 'Trade not found' });
      }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const tradeId = req.params.tradeId;
      console.log(`[Express Proxy] Closing trade ID: ${tradeId} for user: ${req.user.id}`);

      const trade = await db.query.trades.findFirst({
        where: (t, { eq, and }) => and(
          eq(t.id, parseInt(tradeId)),
          eq(t.userId, req.user.id)
        )
      });

      if (!trade) {
        console.log(`[Express Proxy] Trade ${tradeId} not found for user ${req.user.id}`);
        return res.status(404).json({ error: 'Trade not found' });
      }

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

  // 4. Get active trades → GET /api/trades (returns non-CLOSED/FAILED trades for current user only)
  app.get('/api/trades', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      console.log(`[Express Proxy] Getting active trades for user ${req.user.id}`);

      // Get only trades for the current authenticated user
      const userTrades = await db.query.trades.findMany({
        where: eq(trades.userId, req.user.id),
        orderBy: desc(trades.createdAt),
        limit: 100
      });

      console.log(`[Express Proxy] Found ${userTrades.length} trades for user ${req.user.id}`);

      const activeTrades = [];
      const flaskPromises = [];

      // Batch Flask status requests for efficiency
      for (const trade of userTrades) {
        if (!trade.flaskTradeId) continue;

        flaskPromises.push(
          fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`)
            .then(response => response.ok ? response.json() : null)
            .then(flaskData => {
              if (flaskData && !['CLOSED', 'FAILED', 'closed', 'failed'].includes(flaskData.status)) {
                return {
                  ...trade,
                  status: flaskData.status,
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

      console.log(`[Express Proxy] Found ${activeTrades.length} active trades for user ${req.user.id}`);
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

      // Get only trades for the current authenticated user
      const allTrades = await db.query.trades.findMany({
        where: eq(trades.userId, req.user.id)
      });

      console.log(`[Express Proxy] Found ${allTrades.length} trades for user ${req.user.id}`);

      const completedTrades = [];
      const flaskPromises = [];

      // Batch Flask status requests for efficiency
      for (const trade of allTrades) {
        if (!trade.flaskTradeId) continue;

        flaskPromises.push(
          fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`)
            .then(response => response.ok ? response.json() : null)
            .then(flaskData => {
              if (flaskData && ['CLOSED', 'FAILED', 'closed', 'failed'].includes(flaskData.status)) {
                return {
                  ...trade,
                  status: flaskData.status,
                  closedAt: flaskData.closedAt || new Date().toISOString(),
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
      completedTrades.push(...results.filter(result => result !== null));

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