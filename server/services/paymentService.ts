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
      const { formData, amount, currency, description } = req.body;
      
      console.log('[PaymentService] Processing payment with data:', {
        formData: formData ? Object.keys(formData) : 'null',
        amount,
        currency,
        description: description ? description.substring(0, 50) + '...' : 'null'
      });

      // For credit card payments, we need to create the payment using the token
      if (formData && formData.token && formData.payment_method_id) {
        console.log('[PaymentService] Processing credit card payment with token:', formData.token.substring(0, 10) + '...');
        
        // In development mode or when tokens are test tokens, simulate successful payment
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || formData.token.startsWith('test_')) {
          console.log('[PaymentService] Development mode - simulating successful credit card payment');
          return res.status(200).json({
            status: 'approved',
            statusDetail: 'simulated_dev_payment',
            payment_id: `dev_${Date.now()}`,
            verified: true,
            test: true
          });
        }
        
        // Production mode - call real Mercado Pago API
        // Determine which Mercado Pago instance to use based on currency
        let accessToken = '';
        if (currency === 'BRL') {
          accessToken = this.mpBR.accessToken;
        } else if (currency === 'MXN') {
          accessToken = this.mpMX.accessToken;
        } else {
          accessToken = this.mpBR.accessToken; // Default to BR
        }
        
        if (!accessToken) {
          console.error('[PaymentService] No access token available for payment creation');
          return res.status(500).json({
            error: 'Payment service configuration error',
            status: 'rejected'
          });
        }

        // Initialize the client with MercadoPago API
        const client = new MercadoPagoConfig({ 
          accessToken: accessToken 
        });
        
        const paymentClient = new Payment(client);
        
        // Create payment body for Mercado Pago following the correct structure
        const paymentBody = {
          transaction_amount: parseFloat(amount),
          token: formData.token,
          description: description || 'Hedgi Currency Hedge',
          installments: parseInt(formData.installments) || 1,
          payment_method_id: formData.payment_method_id,
          issuer_id: formData.issuer_id ? parseInt(formData.issuer_id) : undefined,
          payer: {
            email: formData.payer?.email || 'user@hedgi.com',
            identification: formData.payer?.identification || {
              type: 'CPF',
              number: '12345678909'
            },
            first_name: formData.payer?.first_name || 'Hedgi User'
          }
        };

        // Add idempotency key header for payment creation
        const requestOptions = {
          idempotencyKey: `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        console.log('[PaymentService] Creating payment with body:', {
          transaction_amount: paymentBody.transaction_amount,
          payment_method_id: paymentBody.payment_method_id,
          installments: paymentBody.installments,
          payer_email: paymentBody.payer.email
        });

        try {
          const payment = await paymentClient.create({ 
            body: paymentBody,
            requestOptions: requestOptions
          });
          
          console.log('[PaymentService] Payment created successfully:', {
            id: payment.id,
            status: payment.status,
            status_detail: payment.status_detail,
            amount: payment.transaction_amount,
            payment_method_id: payment.payment_method_id
          });

          return res.status(200).json({
            status: payment.status || 'unknown',
            statusDetail: payment.status_detail,
            payment_id: payment.id,
            verified: payment.status === 'approved',
            test: false,
            date_approved: payment.date_approved,
            payment_method_id: payment.payment_method_id
          });

        } catch (createError) {
          console.error('[PaymentService] Error creating payment:', createError);
          
          // Log more detailed error information
          if (createError && typeof createError === 'object') {
            console.error('[PaymentService] Error details:', {
              message: createError.message,
              status: createError.status,
              cause: createError.cause
            });
          }
          
          return res.status(500).json({
            error: 'Failed to create payment',
            status: 'rejected',
            details: createError instanceof Error ? createError.message : String(createError)
          });
        }
      }

      // If we don't have the required credit card data, look for an existing payment ID
      let paymentId = null;
      
      if (formData) {
        // Try multiple ways to extract payment ID from Mercado Pago response
        paymentId = formData.id || 
                   formData.payment_id || 
                   formData.payment?.id || 
                   formData.transaction_id;
      }
      
      if (!paymentId) {
        console.error('[PaymentService] No payment token or ID found in form data:', {
          hasToken: !!formData?.token,
          hasPaymentMethodId: !!formData?.payment_method_id,
          hasId: !!formData?.id,
          formDataKeys: formData ? Object.keys(formData) : []
        });
        return res.status(400).json({
          error: 'No payment token or ID received from Mercado Pago',
          status: 'rejected'
        });
      }
      
      console.log(`[PaymentService] Extracted payment ID: ${paymentId}`);
      
      // Handle test payments in development only - be more restrictive
      if (process.env.NODE_ENV === 'development' && 
          (String(paymentId).startsWith('test_payment_') || 
           String(paymentId).startsWith('test_mp_') || 
           String(paymentId).startsWith('test_'))) {
        console.log(`[PaymentService] Development test payment detected: ${paymentId}`);
        return res.status(200).json({
          status: 'approved',
          statusDetail: 'test_payment_dev',
          payment_id: paymentId,
          verified: true,
          test: true
        });
      }




      
      // Validate payment ID format before making API call
      const paymentIdStr = String(paymentId).trim();
      if (!paymentIdStr || paymentIdStr.length < 8) {
        console.error(`[PaymentService] Invalid payment ID format: ${paymentIdStr}`);
        return res.status(400).json({
          error: 'Invalid payment ID format',
          status: 'rejected',
          details: 'Payment ID must be at least 8 characters long'
        });
      }
      
      // For any real payment, we MUST verify with Mercado Pago
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
      
      if (!accessToken) {
        console.error('[PaymentService] No access token available for payment verification');
        return res.status(500).json({
          error: 'Payment service configuration error',
          status: 'rejected'
        });
      }
      
      // Initialize the client with MercadoPago v2.3.0 API
      const client = new MercadoPagoConfig({ 
        accessToken: accessToken 
      });
      
      // Initialize the Payment resource
      const paymentClient = new Payment(client);
      
      try {
        // ALWAYS verify with Mercado Pago for real payment IDs
        const payment = await paymentClient.get({ id: paymentId });
        
        console.log(`[PaymentService] Payment verification response from Mercado Pago:`, {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          amount: payment.transaction_amount,
          currency_id: payment.currency_id
        });
        
        // Only approve if the payment status is explicitly 'approved'
        const isApproved = payment.status === 'approved';
        
        if (!isApproved) {
          console.log(`[PaymentService] Payment ${paymentId} not approved. Status: ${payment.status}`);
          return res.status(400).json({
            error: 'Payment not approved',
            status: payment.status || 'rejected',
            statusDetail: payment.status_detail,
            verified: false
          });
        }
        
        // Payment is approved
        console.log(`[PaymentService] Payment ${paymentId} successfully verified as approved`);
        return res.status(200).json({
          status: 'approved',
          statusDetail: payment.status_detail,
          payment_id: payment.id,
          verified: true,
          amount: payment.transaction_amount,
          currency: payment.currency_id
        });
        
      } catch (paymentError: any) {
        console.error(`[PaymentService] Error verifying payment ${paymentId}:`, paymentError);
        
        // Check if it's a 404 (payment not found) or other error
        if (paymentError.status === 404 || paymentError.message?.includes('not found')) {
          return res.status(404).json({
            error: 'Payment not found',
            status: 'rejected',
            details: 'Payment ID does not exist in Mercado Pago'
          });
        }
        
        // Other errors (network, auth, etc.)
        return res.status(500).json({
          error: 'Payment verification failed',
          status: 'rejected',
          details: paymentError.message || 'Unknown error during verification'
        });
      }
      
    } catch (error) {
      console.error('[PaymentService] Error processing payment:', error);
      return res.status(500).json({
        error: 'Failed to process payment',
        status: 'rejected',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const paymentService = new PaymentService();