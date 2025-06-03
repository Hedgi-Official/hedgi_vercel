import { Request, Response } from 'express';
// Import MercadoPago SDK - we're using v2.3.0
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
// Import application configuration
import { PAYMENT_CONFIG } from '../config';

/**
 * Payment request interface
 */
export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  payer: {
    email: string;
    name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

/**
 * Payment service to handle Mercado Pago integrations
 */
class PaymentService {
  private mpBR: { accessToken: string; publicKey: string };
  private mpMX: { accessToken: string; publicKey: string };
  private enablePayments: boolean;

  constructor() {
    // Initialize payment configuration
    this.mpBR = {
      accessToken: PAYMENT_CONFIG.MP_BR_ACCESS_TOKEN || '',
      publicKey: PAYMENT_CONFIG.MP_BR_PUBLIC_KEY || 'DEV_PUBLIC_KEY'
    };

    this.mpMX = {
      accessToken: PAYMENT_CONFIG.MP_MX_ACCESS_TOKEN || '',
      publicKey: PAYMENT_CONFIG.MP_MX_PUBLIC_KEY || 'DEV_PUBLIC_KEY'
    };

    // Enable payments only if we have proper configuration
    this.enablePayments = PAYMENT_CONFIG.ENABLE_PAYMENTS === 'true' && 
                         !!this.mpBR.accessToken && 
                         this.mpBR.accessToken !== 'your_mp_br_access_token_here';

    console.log('[PaymentService] Initialization complete');
    console.log('[PaymentService] Payments enabled:', this.enablePayments);
  }

  /**
   * Check if payments are enabled
   */
  isPaymentEnabled(): boolean {
    return this.enablePayments;
  }

  /**
   * Create a payment preference in Mercado Pago
   */
  async createPreference(req: Request, res: Response): Promise<Response> {
    // If payments are disabled, return a clear message
    if (!this.enablePayments) {
      return res.status(200).json({
        message: 'Payments are disabled in this environment',
        enabled: false
      });
    }

    try {
      const { amount, currency, description, payer } = req.body as PaymentRequest;

      if (!amount || !currency || !description || !payer || !payer.email) {
        return res.status(400).json({
          error: 'Missing required payment information'
        });
      }

      // Only support BRL for real payments
      if (currency !== 'BRL') {
        return res.status(400).json({
          error: 'Only BRL payments are supported. MXN trades use test mode.',
          testMode: true
        });
      }

      const accessToken = this.mpBR.accessToken;

      if (!accessToken) {
        return res.status(500).json({
          error: 'Payment service configuration is incomplete'
        });
      }

      // Initialize the client
      const client = new MercadoPagoConfig({ 
        accessToken: accessToken 
      });

      // Initialize the Preference resource
      const preference = new Preference(client);

      // Get the base URL from request headers
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      console.log('[PaymentService] Using base URL:', baseUrl);
      console.log('[PaymentService] Creating preference with amount:', amount, 'currency:', currency);

      // Create preference body
      const preferenceBody = {
        items: [
          {
            title: description,
            unit_price: amount,
            quantity: 1,
            currency_id: currency
          }
        ],
        payer: {
          name: payer.name || 'Hedgi User',
          email: payer.email,
          identification: payer.identification
        },
        back_urls: {
          success: `${baseUrl}/payment/success`,
          failure: `${baseUrl}/payment/failure`,
          pending: `${baseUrl}/payment/pending`
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/payment/webhook`,
        external_reference: `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Create the preference
      const preferenceResult = await preference.create({ body: preferenceBody });

      console.log('[PaymentService] Preference created:', {
        id: preferenceResult.id,
        initPoint: preferenceResult.init_point,
        sandboxInitPoint: preferenceResult.sandbox_init_point
      });

      return res.status(200).json({
        id: preferenceResult.id,
        public_key: this.mpBR.publicKey,
        init_point: preferenceResult.init_point,
        sandbox_init_point: preferenceResult.sandbox_init_point,
        enabled: true
      });

    } catch (error) {
      console.error('[PaymentService] Error creating preference:', error);
      return res.status(500).json({
        error: 'Failed to create payment preference',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process a payment - simplified approach
   */
  async processPayment(req: Request, res: Response): Promise<Response> {
    if (!this.enablePayments) {
      return res.status(400).json({
        error: 'Payments are currently disabled',
        status: 'rejected'
      });
    }

    try {
      const { paymentId, currency } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          error: 'Payment ID is required',
          status: 'rejected'
        });
      }

      // For test payments, approve immediately
      if (paymentId.startsWith('test_') || paymentId.startsWith('payment_')) {
        console.log(`[PaymentService] Processing test payment: ${paymentId}`);
        return res.status(200).json({
          status: 'approved',
          statusDetail: 'test-mode payment',
          transactionId: paymentId,
          verified: true
        });
      }

      // For real payments, verify with Mercado Pago
      console.log(`[PaymentService] Verifying real payment: ${paymentId}`);

      const client = new MercadoPagoConfig({ 
        accessToken: this.mpBR.accessToken 
      });

      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: paymentId });

      console.log(`[PaymentService] Payment verification response:`, {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        amount: payment.transaction_amount,
        currency_id: payment.currency_id
      });

      const isApproved = payment.status === 'approved';

      return res.status(200).json({
        status: payment.status || 'unknown',
        statusDetail: payment.status_detail,
        transactionId: payment.id?.toString(),
        verified: isApproved,
        amount: payment.transaction_amount,
        currency: payment.currency_id
      });

    } catch (error) {
      console.error('[PaymentService] Error processing payment:', error);
      return res.status(500).json({
        error: 'Failed to process payment',
        status: 'rejected',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify payment status with Mercado Pago
   */
  async verifyPayment(paymentId: string): Promise<{ status: string; statusDetail?: string; transactionId?: string }> {
    if (!this.enablePayments) {
      throw new Error('Payments are currently disabled');
    }

    try {
      const client = new MercadoPagoConfig({ 
        accessToken: this.mpBR.accessToken 
      });

      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: paymentId });

      return {
        status: payment.status || 'unknown',
        statusDetail: payment.status_detail,
        transactionId: payment.id?.toString()
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw new Error('Failed to verify payment status');
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();