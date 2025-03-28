import express, { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';

const router = express.Router();

/**
 * Create a payment preference
 * This endpoint generates a payment preference ID that can be used to initiate
 * the Mercado Pago payment flow on the client side.
 */
router.post('/api/payment/preference', async (req: Request, res: Response) => {
  await paymentService.createPreference(req, res);
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
  res.redirect('/dashboard?payment=success');
});

/**
 * Payment failure callback endpoint
 * Mercado Pago redirects here after a failed payment
 */
router.get('/payment/failure', (_req: Request, res: Response) => {
  res.redirect('/dashboard?payment=failure');
});

/**
 * Payment pending callback endpoint
 * Mercado Pago redirects here when the payment is pending
 */
router.get('/payment/pending', (_req: Request, res: Response) => {
  res.redirect('/dashboard?payment=pending');
});

export default router;