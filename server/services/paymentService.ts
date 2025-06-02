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
      accessToken: process.env.MP_BR_ACCESS_TOKEN || '', // Use from environment directly
    };
    
    this.mpMX = {
      publicKey: PAYMENT_CONFIG.MX_PUBLIC_KEY,
      accessToken: process.env.MP_MX_ACCESS_TOKEN || '', // Use from environment directly
    };
    
    console.log(`Payment service initialized. Payments enabled: ${this.enablePayments}`);
    console.log(`BR Access Token: ${this.mpBR.accessToken ? 'Available (Key length: ' + this.mpBR.accessToken.length + ')' : 'Not available'}`);
    console.log(`MX Access Token: ${this.mpMX.accessToken ? 'Available (Key length: ' + this.mpMX.accessToken.length + ')' : 'Not available'}`);
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

      // Create absolute URL for redirection - this is crucial for Mercado Pago to work
      const absoluteBaseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      console.log(`[PaymentService] Using base URL: ${absoluteBaseUrl}`);
      
      // Log the incoming amount for debugging
      console.log(`[PaymentService] Creating preference with amount: ${amount}, currency: ${currency}`);
      
      // Ensure amount is a valid number and not zero
      if (!amount || amount <= 0) {
        console.error(`[PaymentService] Invalid amount received: ${amount}`);
        return res.status(400).json({
          code: 'bad_request',
          message: 'Amount cannot be zero or less than zero'
        });
      }

      // Create preference object according to MercadoPago v2.3.0 API
      const preferenceData: any = {
        items: [
          {
            id: `item_${Date.now()}`,
            title: description,
            quantity: 1,
            unit_price: Number(amount), // Ensure it's a number
            currency_id: currency
          }
        ],
        payer: {
          email: payer.email,
          name: payer.name,
          identification: payer.identification
        },
        
        // Proper back_urls structure exactly matching Mercado Pago's documentation
        back_urls: {
          success: `${absoluteBaseUrl}/payment/success`,
          failure: `${absoluteBaseUrl}/payment/failure`, 
          pending: `${absoluteBaseUrl}/payment/pending`
        },
        
        // Restrict payment methods
        payment_methods: {
          excluded_payment_methods: [
            { id: "ticket" },
            { id: "atm" },
            { id: "prepaid_card" },
            { id: "digital_currency" },
            { id: "digital_wallet" }
          ],
          excluded_payment_types: [
            { id: "ticket" },
            { id: "atm" }
          ]
        }
      };
      
      // Use a different approach for test/dev environment
      if (process.env.NODE_ENV !== 'production') {
        // For testing, we'll use a simpler configuration that doesn't require redirection
        delete preferenceData.auto_return; // Remove this property completely for test env
      } else {
        // Only set auto_return in production with valid URLs
        preferenceData.auto_return = "approved";
      }
      
      // Call Mercado Pago API to create preference
      const response = await preference.create({ body: preferenceData });
      
      // Log the full response for debugging
      console.log(`[PaymentService] Preference created:`, {
        id: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point
      });
      
      // Return the preference ID and checkout URL to the client
      return res.status(200).json({
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        public_key: this.getPublicKey(currency),
        enabled: true
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
   * Verify payment status with Mercado Pago
   * @param paymentId Payment ID to verify
   * @returns Payment verification result
   */
  async verifyPayment(paymentId: string): Promise<{ status: string; statusDetail?: string; transactionId?: string }> {
    if (!this.enablePayments) {
      throw new Error('Payments are currently disabled');
    }

    try {
      // Use BR access token by default - in production you'd determine this based on the payment
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

  /**
   * Process a payment
   * @param req Express request
   * @param res Express response
   */
  async processPayment(req: Request, res: Response): Promise<Response> {
    // If payments are disabled, return an error
    if (!this.enablePayments) {
      return res.status(400).json({
        error: 'Payments are currently disabled',
        status: 'rejected'
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
        try {
          // Query Mercado Pago API to get actual payment status for this preference
          console.log(`[PaymentService] Checking payment status for preference: ${preferenceId}`);
          
          // We need to search for payments associated with this preference
          // Note: In production, you should use webhooks for real-time payment status
          // For now, we'll return pending status to force proper payment completion
          
          return res.status(200).json({
            status: 'pending',
            statusDetail: 'pending_payment_in_process',
            message: 'Payment verification required. Please complete the payment process.',
            transactionId: null
          });
        } catch (error) {
          console.error('Error checking payment status by preference:', error);
          return res.status(500).json({
            error: 'Failed to check payment status',
            details: error instanceof Error ? error.message : String(error)
          });
        }
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