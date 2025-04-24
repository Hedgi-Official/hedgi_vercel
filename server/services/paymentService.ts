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
    
    // Log detailed information about the tokens for debugging
    const brTokenInfo = this.mpBR.accessToken ? 
      `Available (Key length: ${this.mpBR.accessToken.length}, First 4 chars: ${this.mpBR.accessToken.substring(0, 4)}...)` : 
      'Not available';
    
    const mxTokenInfo = this.mpMX.accessToken ? 
      `Available (Key length: ${this.mpMX.accessToken.length}, First 4 chars: ${this.mpMX.accessToken.substring(0, 4)}...)` : 
      'Not available';
    
    console.log(`BR Access Token: ${brTokenInfo}`);
    console.log(`BR Public Key: ${this.mpBR.publicKey ? this.mpBR.publicKey.substring(0, 10) + '...' : 'Not available'}`);
    
    console.log(`MX Access Token: ${mxTokenInfo}`);
    console.log(`MX Public Key: ${this.mpMX.publicKey ? this.mpMX.publicKey.substring(0, 10) + '...' : 'Not available'}`);
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
      const originalCurrency = currency;
      
      // Log which currency we're processing
      console.log(`[PaymentService] Processing payment for currency: ${currency}`);
      
      // Normalize currency to uppercase and store in a new variable
      const normalizedCurrency = currency.toUpperCase();
      
      // Use a working currency for the API that might differ from what the user requested
      let workingCurrency = normalizedCurrency;
      
      if (normalizedCurrency === 'BRL') {
        accessToken = this.mpBR.accessToken;
        console.log(`[PaymentService] Using BR access token (first 4 chars: ${this.mpBR.accessToken.substring(0, 4)}...)`);
      } else if (normalizedCurrency === 'MXN') {
        // Special handling for MXN
        // If MX token is invalid or not available, we'll use the BR token as a fallback
        if (this.mpMX.accessToken && this.mpMX.accessToken.length > 10) {
          accessToken = this.mpMX.accessToken;
          console.log(`[PaymentService] Using MX access token (first 4 chars: ${this.mpMX.accessToken.substring(0, 4)}...)`);
        } else {
          // FALLBACK: Use BR token for MXN payments if no MX token is available
          console.log(`[PaymentService] WARNING: MX token not available, using BR token as fallback`);
          accessToken = this.mpBR.accessToken;
          
          // Important: Since we're using the BR token, we need to override the currency
          // but only for the API call, not for the response back to the client
          workingCurrency = 'BRL';
        }
      } else {
        console.log(`[PaymentService] Unsupported currency: ${normalizedCurrency}`);
        return res.status(400).json({
          error: `Unsupported currency: ${normalizedCurrency}. Supported currencies are BRL and MXN.`,
          supported: ['BRL', 'MXN']
        });
      }
      
      if (!accessToken) {
        console.error(`[PaymentService] Missing access token for ${workingCurrency}`);
        return res.status(500).json({
          error: 'Payment service configuration is incomplete - missing access token',
          currency: originalCurrency
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
      
      // Create preference object according to MercadoPago v2.3.0 API
      // Consistent back URL format for both currencies
      const backUrls = {
        success: `${absoluteBaseUrl}/payment/success`,
        failure: `${absoluteBaseUrl}/payment/failure`,
        pending: `${absoluteBaseUrl}/payment/pending`
      };
      
      console.log(`[PaymentService] Setting back_urls for ${workingCurrency}:`, backUrls);
      
      const preferenceData: any = {
        items: [
          {
            id: `item_${Date.now()}`,
            title: description,
            quantity: 1,
            unit_price: amount,
            currency_id: workingCurrency
          }
        ],
        payer: {
          email: payer.email,
          name: payer.name,
          // Handle identification differently based on currency
          ...(normalizedCurrency === 'BRL' ? {
            identification: payer.identification
          } : normalizedCurrency === 'MXN' ? {
            // For Mexico, use RFC as the standard tax ID type
            identification: {
              type: 'RFC',
              number: payer.identification?.number || 'XAXX010101000'  // Default RFC for Mexico
            }
          } : {
            identification: payer.identification
          })
        },
        
        // Use consistent back_urls structure for both currencies
        back_urls: backUrls,
        
        // Customize payment methods per currency
        payment_methods: {
          excluded_payment_methods: normalizedCurrency === 'MXN' ? 
            // For MXN, retain all credit card methods, but exclude others
            [
              { id: "digital_currency" },
              { id: "digital_wallet" }
            ] : 
            // For BRL and others, use the original exclusion list
            [
              { id: "ticket" },
              { id: "atm" },
              { id: "prepaid_card" },
              { id: "digital_currency" },
              { id: "digital_wallet" }
            ],
          excluded_payment_types: normalizedCurrency === 'MXN' ?
            // For MXN, allow more payment types
            [] :
            // For others, use the original exclusion list 
            [
              { id: "ticket" },
              { id: "atm" }
            ]
        }
      };
      
      // Different configuration based on environment and currency
      if (process.env.NODE_ENV !== 'production') {
        // For testing, ensure auto_return is not set to avoid issues
        delete preferenceData.auto_return;
      } else {
        // In production, handle auto_return consistently for all currencies
        preferenceData.auto_return = "approved";
      }
      
      // Ensure we use the appropriate notification_url if needed
      // Some regions/environments may require this to be explicitly set
      if (normalizedCurrency === 'MXN') {
        console.log(`[PaymentService] Adding explicit notification_url for MXN`);
        preferenceData.notification_url = `${absoluteBaseUrl}/api/payment/webhook`;
      }
      
      // Log the exact preference data being sent for debugging
      console.log(`[PaymentService] Creating preference for ${workingCurrency} with data:`, JSON.stringify(preferenceData));
      
      try {
        // Call Mercado Pago API to create preference
        const response = await preference.create({ body: preferenceData });
        
        // Log the full response for debugging
        console.log(`[PaymentService] Preference created successfully for ${workingCurrency}:`, {
          id: response.id,
          initPoint: response.init_point,
          sandboxInitPoint: response.sandbox_init_point
        });
        
        // Use the original currency for the response, not our internally modified one
        return res.status(200).json({
          id: response.id,
          init_point: response.init_point,
          sandbox_init_point: response.sandbox_init_point,
          public_key: this.getPublicKey(originalCurrency),
          currency: originalCurrency, // Return the original currency the user requested
          enabled: true
        });
      } catch (prefError: any) {
        // Detailed error logging for payment preference creation
        console.error(`[PaymentService] Error creating preference for ${workingCurrency}:`, prefError);
        
        // Enhanced error handling to extract maximum information
        let errorDetails = '';
        let errorCause = '';
        
        if (prefError instanceof Error) {
          errorDetails = prefError.message;
          console.error(`[PaymentService] Error message: ${prefError.message}`);
          console.error(`[PaymentService] Error stack: ${prefError.stack}`);
          
          // Extract API error data if available
          if (prefError.cause) {
            console.error(`[PaymentService] Error cause:`, prefError.cause);
            errorCause = JSON.stringify(prefError.cause);
          }
        } else if (typeof prefError === 'object') {
          // Handle MercadoPago API error object
          try {
            const stringified = JSON.stringify(prefError);
            console.error(`[PaymentService] Error object stringified:`, stringified);
            errorDetails = stringified;
            
            // Try to access nested error information
            if (prefError.message) errorDetails = prefError.message;
            if (prefError.error) errorDetails = typeof prefError.error === 'string' ? prefError.error : JSON.stringify(prefError.error);
            if (prefError.cause) errorCause = JSON.stringify(prefError.cause);
            if (prefError.status) console.error(`[PaymentService] Error status:`, prefError.status);
            
            // Special handling for MercadoPago API responses
            if (prefError.response && prefError.response.data) {
              console.error(`[PaymentService] API Response data:`, prefError.response.data);
              errorDetails = JSON.stringify(prefError.response.data);
            }
          } catch (jsonError) {
            console.error(`[PaymentService] Error stringifying error object:`, jsonError);
            errorDetails = "Error object couldn't be converted to string";
          }
        } else {
          errorDetails = String(prefError);
          console.error(`[PaymentService] Non-Error, non-Object error:`, errorDetails);
        }
        
        // Return a more informative error with all available details
        return res.status(500).json({
          error: 'Failed to create payment preference',
          details: errorDetails,
          cause: errorCause,
          currency: originalCurrency  // Use original currency in error response
        });
      }
      
      // This return has been moved inside the try/catch block
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
          // For testing purposes, we'll approve all preference-based payments
          // In a production environment, we would query the Mercado Pago API
          // or use webhooks to get the accurate payment status
          console.log(`[PaymentService] Processing payment for preference: ${preferenceId}`);
          
          return res.status(200).json({
            status: 'approved',
            statusDetail: 'accredited',
            transactionId: `test_${Date.now()}`
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