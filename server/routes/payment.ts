import express, { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';

const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'TEST-XXXXXXXXXXXXXXXX'; 


/**
 * Create a payment preference
 * This endpoint generates a payment preference ID that can be used to initiate
 * the Mercado Pago payment flow on the client side.
 */
router.post('/api/payment/preference', async (req: Request, res: Response) => {
  try {
    // The front end should send exactly this v2 shape:
    // {
    //   type: "online",
    //   external_reference: "hedge_1234567890",
    //   items: [ { title, description, category_id, quantity, unit_price } ],
    //   payer: { email, name, identification: { type, number } },
    //   back_urls: { success: "...", failure: "...", pending: "..." },
    //   auto_return: "approved"
    // }
    const orderPayload = req.body;

    // Basic sanity check – make sure the client gave us the required fields:
    if (
      orderPayload.type !== 'online' ||
      typeof orderPayload.external_reference !== 'string' ||
      !Array.isArray(orderPayload.items) ||
      typeof orderPayload.payer !== 'object' ||
      typeof orderPayload.back_urls !== 'object'
    ) {
      return res
        .status(400)
        .json({ error: 'Invalid payload: missing required Checkout‐Order fields.' });
    }

    // Forward to MP's Checkout Orders endpoint:
    const mpResponse = await fetch(
      `https://api.mercadopago.com/checkout/orders?access_token=${MP_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      }
    );

    const mpJson = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[Express → MP] Create Order error:', mpJson);
      // Send MP's error message straight back to the client
      return res.status(mpResponse.status).json({ error: mpJson });
    }

    // MP returns something like { id: "1234567890", public_key: "TEST-ABCD1234", … }
    const { id: orderId, public_key: publicKey } = mpJson as any;
    if (!orderId || !publicKey) {
      console.error('[Express → MP] Missing orderId/publicKey in response:', mpJson);
      return res
        .status(500)
        .json({ error: 'Invalid response from MP: missing orderId or publicKey.' });
    }

    // Return only what the front end needs:
    return res.json({ orderId, publicKey });
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
    const FLASK = process.env.FLASK_URL || "http://3.145.164.47";
    console.log('[Express → Flask] Received payload:', req.body);

    const v2 = req.body;

    // Check if this is a real payment submission with actual card token
    const hasRealToken = v2.transactions?.payments?.[0]?.payment_method?.token && 
                        v2.transactions.payments[0].payment_method.token.length >= 32 &&
                        v2.transactions.payments[0].payment_method.token !== "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    if (hasRealToken) {
      // This is a real payment submission from the Brick - forward to Flask
      console.log('[Express → Flask] Processing real payment with card token:', v2.transactions.payments[0].payment_method.token.substring(0, 8) + '...');

      const v1OrdersPayload = {
        type: "online",
        processing_mode: "automatic",
        total_amount: String(v2.total_amount || v2.transactions.payments[0].amount),
        external_reference: v2.external_reference,
        payer: {
          email: v2.payer.email
        },
        transactions: {
          payments: [
            {
              amount: String(v2.transactions.payments[0].amount),
              payment_method: {
                id: v2.transactions.payments[0].payment_method.id,
                type: v2.transactions.payments[0].payment_method.type,
                token: v2.transactions.payments[0].payment_method.token  // 👈 REAL token from Brick
              },
              installments: v2.transactions.payments[0].payment_method.installments || 1
            }
          ]
        }
      };

      console.log('[Express → Flask] Sending real payment to Flask:', {
        ...v1OrdersPayload,
        transactions: {
          payments: [{
            ...v1OrdersPayload.transactions.payments[0],
            payment_method: {
              ...v1OrdersPayload.transactions.payments[0].payment_method,
              token: v1OrdersPayload.transactions.payments[0].payment_method.token.substring(0, 8) + '...'
            }
          }]
        }
      });

      const response = await fetch(`${FLASK}/api/payment/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v1OrdersPayload)
      });

      console.log('[Express → Flask] Flask response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Express → Flask] Flask error:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      console.log('[Express → Flask] Flask success:', result);
      return res.json(result);
    } else {
      // This is just order creation (initial call) - return mock success for frontend
      console.log('[Express → Flask] Initial order creation, returning mock response');
      return res.json({
        orderId: `ORDER_${Date.now()}`,
        publicKey: process.env.MP_BR_PUBLIC_KEY || "TEST-MOCK-PUBLIC-KEY"
      });
    }
  } catch (error) {
    console.error('[Express → Flask] Payment order proxy error:', error);
    res.status(500).json({ error: 'Proxy error: ' + (error as Error).message });
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