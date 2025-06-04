import express, { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';

const router = express.Router();

// Cache to prevent duplicate order creation requests
const orderCache = new Map<string, any>();
const CACHE_DURATION = 30000; // 30 seconds

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'TEST-XXXXXXXXXXXXXXXX'; 


/**
 * Create a payment preference
 * This endpoint generates a payment preference ID that can be used to initiate
 * the Mercado Pago payment flow on the client side.
 */
router.post('/api/payment/preference', async (req: Request, res: Response) => {
  try {
    console.log('[Express] Creating preference with payload:', req.body);

    // Use the payment service to create the preference
    const result = await paymentService.createPreference(req, res);
    return result;
  } catch (err) {
    console.error('[Express] /api/payment/preference exception:', err);
    return res.status(500).json({ error: `Internal error: ${err}` });
  }
});

/**
 * Create a Mercado Pago "order" (V2) - proxy to Flask server
 */
router.post('/api/payment/order', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('[Express] Received /api/payment/order payload:', payload);

    // Create a cache key based on external_reference to prevent duplicates
    const cacheKey = payload.external_reference || `${Date.now()}_${Math.random()}`;
    
    // Check if we already have a cached response for this request
    if (orderCache.has(cacheKey)) {
      const cachedResponse = orderCache.get(cacheKey);
      console.log('[Express] Returning cached order response for:', cacheKey);
      return res.json(cachedResponse);
    }

    const payment = payload?.payment_details?.transactions?.payments?.[0];
    const hasRealToken = !!payment?.payment_method?.token;

    if (hasRealToken) {
      // This is a real payment submission from the Brick - forward to Flask
      const FLASK = process.env.FLASK_URL || "http://3.145.164.47";
      console.log('[Express → Flask] Processing real payment with card token');

      // Extract payment data from the payload
      const paymentData = payload.payment_details.transactions.payments[0];
      
      // Get total_amount from the correct location
      const totalAmount = payload.payment_details?.total_amount || payload.total_amount;

      // Format the request exactly as Flask expects it (Brick-compatible format)
      const flaskPayload = {
        type: "online",
        external_reference: payload.external_reference,
        payer: {
          email: payload.payer.email
        },
        payment_details: {
          total_amount: totalAmount,
          transactions: {
            payments: [
              {
                amount: paymentData.amount,
                installments: paymentData.payment_method.installments || 1,
                payment_method: {
                  id: paymentData.payment_method.id,
                  type: paymentData.payment_method.type,
                  token: paymentData.payment_method.token
                }
              }
            ]
          }
        }
      };

      console.log('[Express → Flask] Sending payload to Flask:', JSON.stringify(flaskPayload, null, 2));

      const response = await fetch(`${FLASK}/api/payment/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flaskPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Express → Flask] Flask error:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      console.log('[Express → Flask] Flask payment response:', result);
      
      // Check if Flask returned an error status
      if (result.status === 500 || result.response?.status === 500) {
        console.error('[Express → Flask] Flask returned error:', result);
        
        // In development, fallback to test payment approval when Flask fails
        if (process.env.NODE_ENV === 'development') {
          console.log('[Express → Flask] Development mode: approving payment as test due to Flask error');
          
          const testResult = {
            status: 'approved',
            response: {
              id: `test_fallback_${Date.now()}`,
              status: 'approved',
              transaction_amount: payload.payment_details?.total_amount || payload.total_amount,
              status_detail: 'flask_fallback_approved'
            },
            test: true,
            flaskFallback: true
          };
          
          // Continue with trade creation logic using test result
          const hedgeData = payload.hedge_data || payload.hedgeData;
          
          if (hedgeData) {
            try {
              const amountNum = parseFloat(hedgeData.amount);
              const volume = Math.abs(amountNum) / 100000;
              const direction = amountNum > 0 ? 'buy' : 'sell';
              const symbol = `${hedgeData.targetCurrency}${hedgeData.baseCurrency}`;
              
              // Create local trade record without Flask
              const { db } = await import('@db');
              const { trades } = await import('@db/schema');
              
              const localTrade = await db.insert(trades).values({
                userId: req.user?.id || 7,
                ticket: `TEST-FALLBACK-${Date.now()}`,
                broker: 'test_fallback',
                symbol: symbol,
                volume: volume,
                openTime: new Date(),
                durationDays: hedgeData.duration || 7,
                status: 'open',
                flaskTradeId: null,
                metadata: {
                  paymentToken: testResult.response.id,
                  direction: direction,
                  paymentAmount: testResult.response.transaction_amount,
                  flaskFallback: true
                }
              }).returning();
              
              console.log('[Express] Created fallback trade record:', localTrade[0]);
              
              return res.json({
                ...testResult,
                trade: {
                  id: localTrade[0].id,
                  symbol: symbol,
                  volume: volume,
                  direction: direction,
                  created_at: localTrade[0].openTime
                },
                tradeCreated: true
              });
            } catch (tradeError) {
              console.error('[Express] Error creating fallback trade:', tradeError);
              return res.json({
                ...testResult,
                tradeError: tradeError instanceof Error ? tradeError.message : String(tradeError),
                tradeCreated: false
              });
            }
          } else {
            return res.json(testResult);
          }
        } else {
          // In production, return the actual error
          return res.status(500).json({
            error: 'Payment processing failed',
            details: result.response?.message || result.message || 'Internal server error',
            flaskResponse: result
          });
        }
      }

      // Check if payment was approved
      const paymentStatus = result.response?.status || result.status;
      if (paymentStatus === 'approved') {
        console.log('[Express → Flask] Payment approved, creating trade...');
        
        try {
          // Extract trade parameters from the original payload
          const hedgeData = payload.hedge_data || payload.hedgeData;
          
          if (hedgeData) {
            // Convert hedge data to trade format
            const amountNum = parseFloat(hedgeData.amount);
            const volume = Math.abs(amountNum) / 100000;
            const direction = amountNum > 0 ? 'buy' : 'sell';
            const symbol = `${hedgeData.targetCurrency}${hedgeData.baseCurrency}`;
            
            const tradePayload = {
              symbol,
              direction,
              volume,
              metadata: {
                days: hedgeData.duration || 7,
                paymentToken: result.response?.id || result.id,
                margin: hedgeData.margin || 500
              }
            };

            console.log('[Express → Flask] Creating trade with payload:', tradePayload);

            // Call Flask /trades endpoint
            const tradeResponse = await fetch(`${FLASK}/trades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tradePayload)
            });

            if (tradeResponse.ok) {
              const tradeResult = await tradeResponse.json();
              console.log('[Express → Flask] Trade created successfully:', tradeResult);
              
              // Also store the trade in our local database for user interface
              try {
                const { db } = await import('@db');
                const { trades } = await import('@db/schema');
                
                const localTrade = await db.insert(trades).values({
                  userId: req.user?.id || 7,
                  ticket: `FLASK-${tradeResult.id}`,
                  broker: 'flask',
                  symbol: tradeResult.symbol,
                  volume: tradeResult.volume,
                  openTime: new Date(),
                  durationDays: hedgeData.duration || 7,
                  status: 'open',
                  flaskTradeId: tradeResult.id,
                  metadata: {
                    paymentToken: result.response?.id?.toString() || result.id?.toString(),
                    direction: tradeResult.direction,
                    paymentAmount: result.response?.transaction_amount || result.transaction_amount
                  }
                }).returning();
                
                console.log('[Express] Local trade record created:', localTrade[0]);
              } catch (dbError) {
                console.error('[Express] Failed to create local trade record:', dbError);
              }
              
              // Return combined payment and trade result
              return res.json({
                ...result,
                trade: tradeResult,
                tradeCreated: true
              });
            } else {
              const tradeError = await tradeResponse.text();
              console.error('[Express → Flask] Trade creation failed:', tradeError);
              
              // Return payment success but trade failure
              return res.json({
                ...result,
                tradeError: tradeError,
                tradeCreated: false
              });
            }
          } else {
            console.warn('[Express → Flask] No hedge data found in payload for trade creation');
            return res.json(result);
          }
        } catch (tradeError) {
          console.error('[Express → Flask] Error creating trade:', tradeError);
          
          // Return payment success but trade creation error
          return res.json({
            ...result,
            tradeError: tradeError instanceof Error ? tradeError.message : String(tradeError),
            tradeCreated: false
          });
        }
      }
      
      return res.json(result);
    } else {
      // This is order creation (initial call) - validate v2 Preferences payload
      const { type, external_reference, items, payer } = payload;

      if (!type || type !== 'online') {
        return res.status(400).json({
          error: 'Missing required payment information',
          details: 'Required fields: type=\'online\', external_reference, items[], payer.email'
        });
      }

      if (!external_reference || typeof external_reference !== 'string') {
        return res.status(400).json({
          error: 'Missing required payment information',
          details: 'Required fields: type=\'online\', external_reference, items[], payer.email'
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'Missing required payment information',
          details: 'Required fields: type=\'online\', external_reference, items[], payer.email'
        });
      }

      if (!payer || !payer.email) {
        return res.status(400).json({
          error: 'Missing required payment information',
          details: 'Required fields: type=\'online\', external_reference, items[], payer.email'
        });
      }

      // Valid v2 Preferences payload - return mock response for frontend
      console.log('[Express] Valid order creation request, returning mock response');
      
      const response = {
        orderId: `ORDER_${Date.now()}`,
        publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || "TEST-MOCK-PUBLIC-KEY"
      };
      
      // Cache the response to prevent duplicates
      orderCache.set(cacheKey, response);
      setTimeout(() => orderCache.delete(cacheKey), CACHE_DURATION);
      
      return res.json(response);
    }
  } catch (error) {
    console.error('[Express] Payment order error:', error);
    res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
});

/**
 * Process payment
 * This endpoint processes a payment after the user has completed the Mercado Pago flow
 */
router.post('/api/payment/process', async (req: Request, res: Response) => {
  await paymentService.processPayment(req, res);
});

/**
 * Check if payments are enabled
 * This endpoint is used by the client to determine whether to initiate payment processing
 */
router.get('/api/payment/status', (_req: Request, res: Response) => {
  // Return the actual payment status from the service
  res.json({
    enabled: paymentService.isPaymentEnabled()
  });
});

/**
 * Payment success callback endpoint
 * Mercado Pago redirects here after a successful payment
 */
router.get('/payment/success', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          background-color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 24px;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        h1 {
          color: #10b981;
          margin-bottom: 16px;
        }
        p {
          color: #374151;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Payment Successful!</h1>
        <p>Your hedge order has been placed successfully. You can close this window and return to the application.</p>
        <button onclick="notifySuccess()">Close Window</button>
      </div>
      <script>
        function notifySuccess() {
          // Notify the opener window about the successful payment
          if (window.opener) {
            window.opener.postMessage({
              type: 'PAYMENT_SUCCESS',
              data: { result: 'success' }
            }, '*');
          }
          // Close this window
          window.close();
        }

        // Auto-notify on page load
        window.addEventListener('load', function() {
          // Short delay to ensure parent window is ready
          setTimeout(notifySuccess, 500);
        });
      </script>
    </body>
    </html>
  `);
});

/**
 * Payment failure callback endpoint
 * Mercado Pago redirects here after a failed payment
 */
router.get('/payment/failure', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Failed</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          background-color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 24px;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        h1 {
          color: #ef4444;
          margin-bottom: 16px;
        }
        p {
          color: #374151;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Payment Failed</h1>
        <p>There was an issue processing your payment. Please try again or contact customer support if the problem persists.</p>
        <button onclick="notifyFailure()">Close Window</button>
      </div>
      <script>
        function notifyFailure() {
          // Notify the opener window about the failed payment
          if (window.opener) {
            window.opener.postMessage({
              type: 'PAYMENT_FAILED',
              data: { result: 'failure' }
            }, '*');
          }
          // Close this window
          window.close();
        }

        // Auto-notify on page load
        window.addEventListener('load', function() {
          // Short delay to ensure parent window is ready
          setTimeout(notifyFailure, 500);
        });
      </script>
    </body>
    </html>
  `);
});

/**
 * Payment webhook endpoint
 * Mercado Pago sends payment notifications here
 */
router.post('/api/payment/webhook', async (req: Request, res: Response) => {
  try {
    const { id, topic } = req.body;

    if (topic === 'payment') {
      // Process the payment notification
      console.log(`[Payment Webhook] Received payment notification for ID: ${id}`);

      // Verify the payment status with Mercado Pago
      const paymentStatus = await paymentService.verifyPayment(id);

      if (paymentStatus.status === 'approved') {
        // Payment was successful - you can now safely process the trade
        console.log(`[Payment Webhook] Payment ${id} approved`);
        // TODO: Process the hedge/trade creation here
      } else {
        console.log(`[Payment Webhook] Payment ${id} status: ${paymentStatus.status}`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Payment Webhook] Error processing webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * Payment pending callback endpoint
 * Mercado Pago redirects here when the payment is pending
 */
router.get('/payment/pending', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Pending</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          background-color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 24px;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        h1 {
          color: #f59e0b;
          margin-bottom: 16px;
        }
        p {
          color: #374151;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Payment Pending</h1>
        <p>Your payment is being processed. We'll notify you once the payment is confirmed. This may take some time depending on your payment method.</p>
        <button onclick="notifyPending()">Close Window</button>
      </div>
      <script>
        function notifyPending() {
          // Notify the opener window about the pending payment
          if (window.opener) {
            window.opener.postMessage({
              type: 'PAYMENT_PENDING',
              data: { result: 'pending' }
            }, '*');
          }
          // Close this window
          window.close();
        }

        // Auto-notify on page load
        window.addEventListener('load', function() {
          // Short delay to ensure parent window is ready
          setTimeout(notifyPending, 500);
        });
      </script>
    </body>
    </html>
  `);
});

export default router;