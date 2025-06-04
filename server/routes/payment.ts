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
      console.log('[Express → Flask] Flask response:', result);
      
      // Check if Flask returned an error status
      if (result.status === 500 || result.response?.status === 500) {
        console.error('[Express → Flask] Flask returned error:', result);
        return res.status(500).json({
          error: 'Payment processing failed',
          details: result.response?.message || result.message || 'Internal server error',
          flaskResponse: result
        });
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
      return res.json({
        orderId: `ORDER_${Date.now()}`,
        publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || "TEST-MOCK-PUBLIC-KEY"
      });
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