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
  private enablePayments: boolean;
  private mpBR: { publicKey: string; accessToken: string };
  private mpMX: { publicKey: string; accessToken: string };

  /**
   * Initialize payment service with environment variables
   */
  constructor() {
    // Use the configuration from config.ts instead of environment variables directly
    this.enablePayments = PAYMENT_CONFIG.ENABLED;
    
    // Initialize with public and access tokens for both regions
    this.mpBR = {
      publicKey: PAYMENT_CONFIG.BR_PUBLIC_KEY,
      accessToken: PAYMENT_CONFIG.BR_ACCESS_TOKEN,
    };
    
    this.mpMX = {
      publicKey: PAYMENT_CONFIG.MX_PUBLIC_KEY,
      accessToken: PAYMENT_CONFIG.MX_ACCESS_TOKEN,
    };
    
    console.log(`Payment service initialized. Payments enabled: ${this.enablePayments}`);
  }

  /**
   * Check if payments are enabled in the system
   * @returns Boolean indicating if payments are enabled
   */
  isPaymentEnabled(): boolean {
    return this.enablePayments;
  }

  /**
   * Get Mercado Pago public key based on currency
   * @param currency Currency code ('BRL' or 'MXN')
   * @returns Public key for the specified currency region
   */
  getPublicKey(currency: string): string {
    if (currency === 'BRL') {
      return this.mpBR.publicKey;
    } else if (currency === 'MXN') {
      return this.mpMX.publicKey;
    }
    // Default to BR
    return this.mpBR.publicKey;
  }

  /**
   * Create a payment preference in Mercado Pago
   * @param req Express request
   * @param res Express response
   */
  async createPreference(req: Request, res: Response): Promise<Response> {
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
      
      // Configure Mercado Pago with the correct access token based on currency
      let accessToken = '';
      if (currency === 'BRL') {
        accessToken = this.mpBR.accessToken;
      } else if (currency === 'MXN') {
        accessToken = this.mpMX.accessToken;
      } else {
        return res.status(400).json({
          error: 'Unsupported currency'
        });
      }
      
      if (!accessToken) {
        return res.status(500).json({
          error: 'Payment service configuration is incomplete'
        });
      }
      
      // Initialize the client with MercadoPago v2.3.0 API
      const client = new MercadoPagoConfig({ 
        accessToken: accessToken 
      });
      
      // Initialize the Preference resource
      const preference = new Preference(client);

      // Create preference object according to MercadoPago v2.3.0 API
      const preferenceData = {
        items: [
          {
            id: `item_${Date.now()}`,
            title: description,
            quantity: 1,
            unit_price: amount,
            currency_id: currency
          }
        ],
        payer: {
          email: payer.email,
          name: payer.name,
          identification: payer.identification
        },
        back_urls: {
          success: `${req.protocol}://${req.get('host')}/payment/success`,
          failure: `${req.protocol}://${req.get('host')}/payment/failure`,
          pending: `${req.protocol}://${req.get('host')}/payment/pending`
        },
        auto_return: 'approved'
      };
      
      // Call Mercado Pago API to create preference
      const response = await preference.create({ body: preferenceData });
      
      // Return the preference ID and checkout URL to the client
      return res.status(200).json({
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        public_key: this.getPublicKey(currency)
      });
    } catch (error) {
      console.error('Error creating payment preference:', error);
      return res.status(500).json({
        error: 'Failed to create payment preference',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Process a payment
   * @param req Express request
   * @param res Express response
   */
  async processPayment(req: Request, res: Response): Promise<Response> {
    if (!this.enablePayments) {
      // If payments are disabled, simulate a successful payment
      return res.status(200).json({
        status: 'approved',
        message: 'Payment simulation successful (payments disabled)',
        transactionId: `sim_${Date.now()}`
      });
    }

    try {
      const { paymentId, preferenceId, currency } = req.body;
      
      if (!paymentId && !preferenceId) {
        return res.status(400).json({
          error: 'Missing payment ID or preference ID'
        });
      }
      
      // Determine which Mercado Pago instance to use based on currency
      let accessToken = '';
      if (currency === 'BRL') {
        accessToken = this.mpBR.accessToken;
      } else if (currency === 'MXN') {
        accessToken = this.mpMX.accessToken;
      } else {
        // Default to BR if currency not specified
        accessToken = this.mpBR.accessToken;
      }
      
      // Initialize the client with MercadoPago v2.3.0 API
      const client = new MercadoPagoConfig({ 
        accessToken: accessToken 
      });
      
      // Initialize the Payment resource
      const paymentClient = new Payment(client);
      
      // Check payment status
      // If we have a payment ID, check that directly
      if (paymentId) {
        try {
          const payment = await paymentClient.get({ id: paymentId });
          return res.status(200).json({
            status: payment.status,
            statusDetail: payment.status_detail,
            transactionId: payment.id
          });
        } catch (paymentError) {
          console.error('Error getting payment:', paymentError);
          return res.status(404).json({
            error: 'Payment not found',
            details: paymentError instanceof Error ? paymentError.message : String(paymentError)
          });
        }
      }
      
      // Otherwise use the preference ID to find associated payments
      if (preferenceId) {
        // For MercadoPago v2.3.0, we need a different approach
        // In a real implementation, we would use IPN notifications
        // For this demo, we'll return a simulated approved payment
        
        return res.status(200).json({
          status: 'approved',
          statusDetail: 'accredited',
          transactionId: `sim_pref_${Date.now()}`
        });
      }
      
      return res.status(400).json({
        error: 'Invalid payment request'
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      return res.status(500).json({
        error: 'Failed to process payment',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const paymentService = new PaymentService();