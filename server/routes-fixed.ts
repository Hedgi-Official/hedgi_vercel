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

// In-memory cache for payment results
const paymentResultsCache = new Map<string, any>();

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

const FLASK = process.env.FLASK_URL || 'https://boot-wilson-productivity-gsm.trycloudflare.com';

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Local Mercado Pago brick endpoint to avoid CORS issues
  app.get("/api/proxy/brick", async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      // 1) Read amount, txId, and locale from the query string
      const amount = req.query.amount || 415;
      const txId   = req.query.txId   || "";  // will be a UUID set by React
      const lang = req.query.lang || "en-US"; // Default to English

      // Debug user session and account info
      const sessionInfo = {
        sessionId: req.sessionID || 'no-session',
        userId: (req as any).user?.id || 'no-user',
        userAgent: req.get('User-Agent')?.substring(0, 100) || 'no-ua',
        ip: req.ip || req.connection.remoteAddress || 'no-ip',
        referer: req.get('Referer') || 'no-referer'
      };

      console.log(`[Local Brick] /api/proxy/brick endpoint called`);
      console.log(`[Local Brick] Session info:`, sessionInfo);
      console.log(`[Local Brick] Creating Mercado Pago brick for amount=${amount}, txId=${txId}, lang=${lang}`);

      // 2) Forward both to Flask’s /brick endpoint
      //    Flask’s home() route will extract `amount` and `txId` and render them into the HTML.
      const cacheBuster = Date.now();
      const flaskUrl = `https://boot-wilson-productivity-gsm.trycloudflare.com/brick?amount=${amount}&txId=${txId}&lang=${lang}&_cb=${cacheBuster}`;
      console.log(`[Flask Proxy] Fetching brick from: ${flaskUrl}`);

      const fetchStart = Date.now();
      const response = await Promise.race([
        fetch(flaskUrl, {
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
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Flask request timeout after 15 seconds')), 15000)
        )
      ]);

      const fetchTime = Date.now() - fetchStart;
      console.log(`[Local Brick] Flask fetch completed in ${fetchTime}ms with status ${response.status}`);

      if (!response.ok) {
        throw new Error(`Flask server responded with ${response.status}: ${response.statusText}`);
      }

      const htmlStart = Date.now();
      const html = await response.text();
      const htmlTime = Date.now() - htmlStart;
      console.log(`[Local Brick] Generated brick HTML (${html.length} chars) in ${htmlTime}ms`);
      
      // Debug: Show the actual onSubmit signature from Flask
      const onSubmitMatch = html.match(/onSubmit:\s*async\s*\([^)]*\)\s*=>/);
      if (onSubmitMatch) {
        console.log(`[Local Brick] Flask onSubmit signature: ${onSubmitMatch[0]}`);
      }

      // Fix the fetch URL to point to our proxy with HTTPS support
      const originalFetch = 'fetch("/process_payment", {';
      const protocol = req.get('x-forwarded-proto') === 'https' ? 'https' : req.protocol;
      const newFetch = `fetch("${protocol}://${req.get('host')}/api/proxy/process_payment", {`;
      
      let updatedHtml = html.replace(originalFetch, newFetch);
      console.log(`[Brick Proxy] Fetch URL replacement: ${originalFetch} -> ${newFetch}`);

      // Set dynamic locale based on user's language preference
      updatedHtml = updatedHtml.replace(
        'locale: "en-US"',
        `locale: "${lang}"`
      );

      // Fix payment method restrictions to support both Visa and Mastercard
      const beforeReplace = updatedHtml.includes('excluded: ["debit_card"]');
      updatedHtml = updatedHtml.replace(
        'types:           { excluded: ["debit_card"] }',
        'types:           { included: ["credit_card"] }'
      );
      const afterReplace = updatedHtml.includes('included: ["credit_card"]');
      console.log(`[Brick Proxy] Payment method replacement - Before: ${beforeReplace}, After: ${afterReplace}`);

      // Fix payment method ID extraction - use payment_method_id instead of paymentMethodId
      const beforeMethodFix = updatedHtml.includes('cardFormData.paymentMethodId');
      updatedHtml = updatedHtml.replace(
        /cardFormData\.paymentMethodId/g,
        'cardFormData.payment_method_id'
      );
      const afterMethodFix = updatedHtml.includes('cardFormData.payment_method_id');
      console.log(`[Brick Proxy] Payment method ID extraction - Before: ${beforeMethodFix}, After: ${afterMethodFix}`);

      // Also add locale to the Brick settings for form translation
      updatedHtml = updatedHtml.replace(
        'initialization: {',
        `locale: "${lang}",\n        initialization: {`
      );

      // Add enhanced logging to the postMessage section
      updatedHtml = updatedHtml.replace(
        /console\.log\("\[iframe\] proxy JSON:", backendJson\);/,
        `console.log("[iframe] proxy JSON:", backendJson);
              console.log("[iframe] About to check status:", backendJson.status);
              console.log("[iframe] Status comparison result:", backendJson.status === "approved");`
      );

      // Add logging before postMessage calls
      updatedHtml = updatedHtml.replace(
        /window\.parent\.postMessage\(\s*\{\s*status:\s*"approved"/g,
        `console.log("[iframe] SENDING APPROVED postMessage with data:", backendJson);
                window.parent.postMessage({ status: "approved"`
      );

      updatedHtml = updatedHtml.replace(
        /window\.parent\.postMessage\(\s*\{\s*status:\s*"error"/g,
        `console.log("[iframe] SENDING ERROR postMessage");
                window.parent.postMessage({ status: "error"`
      );

      // Add a test postMessage when brick is ready - check if replacement worked
      const beforeOnReadyReplace = updatedHtml.includes('onReady: () => console.log("[iframe] Brick ready for amount =", AMOUNT)');
      updatedHtml = updatedHtml.replace(
        /onReady:\s*\(\)\s*=>\s*console\.log\("\[iframe\] Brick ready for amount =", AMOUNT\)/,
        `onReady: () => {
            console.log("[iframe] Brick ready for amount =", AMOUNT);
            console.log("[iframe] Brick ready, sending test postMessage");
            window.parent.postMessage({ status: "test", message: "iframe ready", txId: TX_ID }, "*");
          }`
      );
      const afterOnReadyReplace = updatedHtml.includes('window.parent.postMessage({ status: "test", message: "iframe ready"');
      console.log(`[Brick Proxy] onReady replacement - Before: ${beforeOnReadyReplace}, After: ${afterOnReadyReplace}`);

      // Debug: Show the final onSubmit signature we're serving
      const finalOnSubmitMatch = updatedHtml.match(/onSubmit:\s*async\s*\([^)]*\)\s*=>/);
      if (finalOnSubmitMatch) {
        console.log(`[Local Brick] Final onSubmit signature: ${finalOnSubmitMatch[0]}`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`[Local Brick] Complete proxy response in ${totalTime}ms for session ${sessionInfo.sessionId}, user ${sessionInfo.userId}`);
      
      // 3) Return it as HTML so the iframe can render it
      res.setHeader("Content-Type", "text/html");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.send(updatedHtml);
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`[Local Brick] Error creating brick after ${errorTime}ms:`, error);
      console.error(`[Local Brick] Error details:`, {
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: req.sessionID || 'unknown',
        userId: (req as any).user?.id || 'unknown'
      });
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

  // Handle CORS preflight for iframe requests
  app.options("/api/proxy/process_payment", (req: Request, res: Response) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });

  app.post("/api/proxy/process_payment", async (req: Request, res: Response) => {
    // Set CORS headers for iframe requests
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    
    try {
      console.log("[Proxy] /api/proxy/process_payment endpoint called!");
      console.log("[Proxy] Request headers:", req.headers);
      console.log("[Proxy] Request method:", req.method);
      console.log("[Proxy] Request URL:", req.url);
      
      // 1) The request body is a JSON object containing:
      //    { token, installments, paymentMethodId, transactionAmount, payer:{…}, amount, txId }
      const originalPayload = req.body;
      console.log("[Proxy] Received payload:", JSON.stringify(originalPayload, null, 2));

      // Extract payment method ID - Flask sends it as payment_method_id
      let paymentMethodId = originalPayload.payment_method_id || 
                           originalPayload.paymentMethodId ||
                           originalPayload.paymentMethod?.id ||
                           originalPayload.payment_method?.id;
      
      console.log("[Proxy] Raw payload keys:", Object.keys(originalPayload));
      console.log("[Proxy] Looking for payment_method_id:", originalPayload.payment_method_id);
      console.log("[Proxy] Looking for paymentMethodId:", originalPayload.paymentMethodId);
      console.log("[Proxy] Extracted payment_method_id:", paymentMethodId);
      
      // Log full payload only if payment method ID is missing for debugging
      if (!paymentMethodId) {
        console.log("[Proxy] MISSING payment_method_id - Full payload:", JSON.stringify(originalPayload, null, 2));
      }

      // Validate that we have required payment method ID
      if (!paymentMethodId) {
        console.error("[Proxy] CRITICAL: payment_method_id not found in payload");
        console.error("[Proxy] Available fields in originalPayload:", Object.keys(originalPayload));
        return res.status(400).json({
          status: "error",
          error: "Payment method ID is required but not found in request",
          txId: originalPayload.txId
        });
      }

      // Transform payload to match Flask's expected format
      const payload = {
        token: originalPayload.token,
        installments: originalPayload.installments || 1,
        payment_method_id: paymentMethodId,
        transaction_amount: originalPayload.transaction_amount || originalPayload.transactionAmount || originalPayload.amount,
        description: `Hedgi order for R$${originalPayload.transaction_amount || originalPayload.transactionAmount || originalPayload.amount}`,
        payer: {
          email: originalPayload.payer?.email,
          identification: originalPayload.payer?.identification,
          first_name: originalPayload.payer?.first_name || "HedgiCustomer"
        },
        txId: originalPayload.txId
      };

      console.log("[Proxy] Transformed payload for Flask:", JSON.stringify(payload, null, 2));

      // 2) Forward it directly to Flask’s /process_payment
      const flaskUrl = `https://boot-wilson-productivity-gsm.trycloudflare.com/process_payment`;
      console.log(`[Proxy] Forwarding to Flask: ${flaskUrl}`);

      const response = await fetch(flaskUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 3) Read Flask’s JSON response (e.g. { status:"approved", id:"abc123", message:"…" })
      const data = await response.json();

      // Store payment result for polling
      if (data.txId) {
        paymentResultsCache.set(data.txId, {
          ...data,
          timestamp: Date.now()
        });
        console.log(`[Proxy] Stored payment result for txId ${data.txId}:`, data);
      }

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

  // Payment status endpoint for polling
  app.get("/api/payment-status/:txId", async (req, res) => {
    try {
      const { txId } = req.params;
      console.log(`[Payment Status] Checking status for txId: ${txId}`);
      
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

  // Working registration endpoint that bypasses schema conflicts
  app.post("/signup", async (req: Request, res: Response) => {
    try {
      const { fullName, email, username, password, phoneNumber, nation, paymentIdentifier, cpf, birthdate } = req.body;

      // Basic validation
      if (!fullName || !email || !username || !password || !nation || !paymentIdentifier || !cpf || !birthdate) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Age validation
      const birthDate = new Date(birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
      
      if (actualAge < 18) {
        return res.status(400).json({ message: "You must be at least 18 years old to use this service" });
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
          cpf,
          birthdate: new Date(birthdate),
          googleCalendarEnabled: false,
          googleRefreshToken: null,
        })
        .returning();

      // Log the user in after successful registration using session
      req.login = req.login || ((user, callback) => {
        req.user = user;
        if (callback) callback();
      });

      req.login(newUser, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        
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

  // 1. Create a new trade → POST /api/trades (proxy to Flask with PIX key)
  app.post('/api/trades', async (req: Request, res: Response) => {
    try {
      // Get user ID from session or default (for authenticated requests)
      const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 7; // Default user for testing
      
      // Fetch user's PIX key from database
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          paymentIdentifier: true
        }
      });

      console.log('[Express Proxy] User data fetched:', user);

      // Prepare the payload with PIX key in metadata
      const payload = {
        ...req.body,
        metadata: {
          ...req.body.metadata,
          pixKey: user?.paymentIdentifier || null
        }
      };

      console.log('[Express Proxy] Forwarding trade request to Flask with PIX key:', payload);

      const response = await fetch(`${FLASK}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
        console.log('[Express Proxy] Attempting to save trade to database with data:', {
          userId,
          flaskTradeId: result.id,
          volume: result.volume,
          symbol: result.symbol,
          created_at: result.created_at,
          metadata: result.metadata
        });
        
        // Don't use Flask ID as primary key, let database auto-generate
        const insertResult = await db.insert(trades).values({
          userId: userId,
          ticket: `FLASK-${result.id}`,
          broker: 'flask',
          volume: result.volume, // Keep as numeric, not string
          symbol: result.symbol,
          openTime: new Date(result.created_at || new Date()),
          durationDays: result.metadata?.days || 7,
          status: 'open',
          flaskTradeId: result.id,
          metadata: result.metadata || {}
        }).returning();
        
        console.log('[Express Proxy] Successfully saved trade to local database:', insertResult);
      } catch (dbError) {
        console.error('[Express Proxy] Failed to save to local database:', dbError);
        console.error('[Express Proxy] Database error details:', {
          message: (dbError as Error).message,
          stack: (dbError as Error).stack
        });
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
      const flaskTradeId = req.params.tradeId;
      console.log(`[Express Proxy] User ${req.user.id} closing Flask trade ${flaskTradeId}`);

      // Direct call to Flask close endpoint using Flask trade ID
      const response = await fetch(`${FLASK}/trades/${flaskTradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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

  // 3.5. Get trade spread info → GET /api/trades/:tradeId/spread (proxy to Flask)
  app.get('/api/trades/:tradeId/spread', async (req: Request, res: Response) => {
    console.log('[SPREAD ENDPOINT] Route hit - tradeId:', req.params.tradeId);
    console.log('[SPREAD ENDPOINT] Authentication check:', req.isAuthenticated());
    console.log('[SPREAD ENDPOINT] FLASK URL:', FLASK);
    
    if (!req.isAuthenticated()) {
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

  // 4. Get active trades → GET /api/trades (returns non-CLOSED/FAILED trades for current user only)
  app.get('/api/trades', async (req: Request, res: Response) => {
    // Use authenticated user ID or fallback to user 7 for testing
    const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 7;
    
    try {
      console.log(`[Express Proxy] Getting active trades for user ${userId}`);

      // Get only trades for the current authenticated user with error handling
      let userTrades;
      try {
        userTrades = await db.query.trades.findMany({
          where: eq(trades.userId, userId),
          orderBy: desc(trades.createdAt),
          limit: 100
        });
      } catch (dbError) {
        console.error('[Express Proxy] Database connection error:', dbError.message);
        // Return empty array if database is temporarily unavailable
        return res.json([]);
      }

      console.log(`[Express Proxy] Found ${userTrades.length} trades for user ${userId}`);

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
                  current_value: flaskData.current_value, // Include current_value from Flask
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


  

  // 5. Get trade history → GET /api/trades/history (proxy to Flask)
  app.get('/api/trades/history', async (req: Request, res: Response) => {
    // Use authenticated user ID or fallback to user 7 for testing
    const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 7;
    
    try {
      console.log('[Express Proxy] Getting trade history from database');

      // Get only trades for the current authenticated user, ordered by creation date DESC
      let allTrades;
      try {
        allTrades = await db.query.trades.findMany({
          where: eq(trades.userId, userId),
          orderBy: (trades, { desc }) => [desc(trades.createdAt)]
        });
      } catch (dbError) {
        console.error('[Express Proxy] Database connection error in trade history:', dbError.message);
        // Return empty array if database is temporarily unavailable
        return res.json([]);
      }

      console.log(`[Express Proxy] Found ${allTrades.length} trades for user ${userId}`);

      const completedTrades = [];
      const flaskPromises = [];

      // Batch Flask status requests for efficiency
      for (const trade of allTrades) {
        if (!trade.flaskTradeId) continue;

        flaskPromises.push(
          fetch(`${FLASK}/trades/${trade.flaskTradeId}/status`)
            .then(response => response.ok ? response.json() : null)
            .then(flaskData => {
              console.log(`[Express Proxy] Flask status for trade ${trade.id} (Flask ${trade.flaskTradeId}):`, flaskData);
              if (flaskData && ['CLOSED', 'FAILED', 'closed', 'failed'].includes(flaskData.status)) {
                const completedTrade = {
                  ...trade,
                  status: flaskData.status,
                  closedAt: flaskData.closedAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                console.log(`[Express Proxy] Added completed trade ${trade.id} with status ${flaskData.status}`);
                return completedTrade;
              }
              console.log(`[Express Proxy] Trade ${trade.id} status ${flaskData?.status || 'unknown'} - not completed`);
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