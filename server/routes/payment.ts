import express, { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';

const router = express.Router();

// Cache to prevent duplicate order creation requests
const orderCache = new Map<string, any>();
const preferenceCache = new Map<string, any>();
const CACHE_DURATION = 30000; // 30 seconds

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'TEST-XXXXXXXXXXXXXXXX'; 


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