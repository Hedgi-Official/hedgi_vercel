import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Hedge } from "db/schema";

// Extend Window interface to include Mercado Pago typings
declare global {
  interface Window {
    MercadoPago: any;
    paymentBrickController: any;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

export function FixedMercadoPaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [mpScriptLoaded, setMpScriptLoaded] = useState(false);
  
  // Use a ref for the payment container element
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  
  // Define a unique ID for the payment container with a timestamp to ensure uniqueness
  const paymentContainerId = `mp_payment_container_${Date.now()}`;

  // Check if payments are enabled when component mounts
  useEffect(() => {
    if (!isOpen) return;
    
    const checkPaymentStatus = async () => {
      try {
        console.log('[MercadoPaymentModal] Checking payment status...');
        const response = await fetch('/api/payment/status');
        const data = await response.json();
        console.log('[MercadoPaymentModal] Payment status:', data);
        setPaymentEnabled(data.enabled);
        
        if (!data.enabled) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[MercadoPaymentModal] Error checking payment status:', error);
        setError('Failed to check payment status');
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [isOpen]);

  // Load Mercado Pago SDK script
  useEffect(() => {
    if (!isOpen || !paymentEnabled) return;
    
    // Only load the script if it hasn't been loaded yet
    if (!window.MercadoPago && !mpScriptLoaded) {
      console.log('[MercadoPaymentModal] Loading Mercado Pago SDK...');
      
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      
      script.onload = () => {
        console.log('[MercadoPaymentModal] Mercado Pago SDK loaded successfully');
        setMpScriptLoaded(true);
      };
      
      script.onerror = (e) => {
        console.error('[MercadoPaymentModal] Error loading Mercado Pago SDK:', e);
        setError('Failed to load payment processor. Please try again later.');
        setLoading(false);
      };
      
      document.head.appendChild(script);
    } else if (window.MercadoPago && !mpScriptLoaded) {
      // SDK already loaded from somewhere else
      console.log('[MercadoPaymentModal] Mercado Pago SDK already loaded');
      setMpScriptLoaded(true);
    }
  }, [isOpen, paymentEnabled, mpScriptLoaded]);

  // Clean up any resources when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      // If the payment brick controller exists, unmount it
      if (window.paymentBrickController) {
        try {
          window.paymentBrickController.unmount();
        } catch (e) {
          console.error('[MercadoPaymentModal] Error unmounting payment brick:', e);
        }
      }
    };
  }, []);

  // Initialize payment when SDK is loaded and we have hedge data
  useEffect(() => {
    const initializePayment = async () => {
      if (!isOpen || !paymentEnabled || !mpScriptLoaded || !hedgeData) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Calculate hedge cost based on amount
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
        const paymentAmount = Number((hedgeCost).toFixed(2));
        
        console.log(`[MercadoPaymentModal] Creating payment preference for ${paymentAmount} ${currency}`);
        
        // Create payment preference
        const response = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmount,
            currency: currency,
            description: `Hedge for ${hedgeAmount} ${hedgeData.targetCurrency}/${hedgeData.baseCurrency}`,
            payer: {
              email: 'customer@example.com',
              name: 'Test Customer',
              identification: {
                type: 'CPF',
                number: '219585466'
              }
            },
          }),
        });
        
        const data = await response.json();
        console.log('[MercadoPaymentModal] Preference data:', data);
        
        if (data.enabled === false) {
          setLoading(false);
          return;
        }
        
        if (!data.id || !data.public_key) {
          throw new Error('Invalid preference data returned from server');
        }

        // Initialize Mercado Pago with returned public key and preference
        const mp = new window.MercadoPago(data.public_key, {
          locale: currency === 'BRL' ? 'pt-BR' : 'es-MX',
        });
        
        console.log('[MercadoPaymentModal] Mercado Pago instance created');
        
        const bricksBuilder = mp.bricks();
        console.log('[MercadoPaymentModal] Bricks builder created');
        
        // Wait for DOM to be fully ready (longer timeout)
        setTimeout(() => {
          console.log(`[MercadoPaymentModal] Looking for payment container with ID: ${paymentContainerId}`);
          
          // Try both the ref and getElementById approaches
          const containerElement = paymentContainerRef.current || document.getElementById(paymentContainerId);
          
          if (!containerElement) {
            console.error(`[MercadoPaymentModal] Payment container not found: #${paymentContainerId}`);
            setError('Payment interface could not be initialized - container not found');
            setLoading(false);
            return;
          }
          
          console.log('[MercadoPaymentModal] Container found, rendering payment brick');
          
          // Render the payment brick - use the container element directly if it's a ref
          bricksBuilder.create('payment', containerElement, {
            initialization: {
              amount: paymentAmount,
              preferenceId: data.id,
              payer: {
                email: 'customer@example.com',
              }
            },
            customization: {
              visual: {
                style: {
                  theme: 'default'
                },
                hideFormTitle: true
              },
              paymentMethods: {
                creditCard: 'all',
                bankTransfer: 'all',
                atm: 'all',
                maxInstallments: 1
              }
            },
            callbacks: {
              onReady: () => {
                console.log('[MercadoPaymentModal] Payment brick ready');
                setLoading(false);
              },
              onSubmit: (formData: any) => {
                console.log('[MercadoPaymentModal] Payment submitted:', formData);
                setLoading(true);
                
                return new Promise((resolve, reject) => {
                  fetch('/api/payment/process', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      preferenceId: data.id,
                      currency: currency,
                      formData: formData
                    }),
                  })
                  .then(response => response.json())
                  .then(result => {
                    console.log('[MercadoPaymentModal] Payment process result:', result);
                    
                    if (result.status === 'approved' || result.status === 'in_process') {
                      if (hedgeData) {
                        onSuccess(hedgeData);
                      }
                      toast({
                        title: 'Payment successful',
                        description: 'Your hedge order has been placed.',
                        variant: 'default',
                      });
                      resolve(undefined);
                      onClose();
                    } else {
                      setError(`Payment ${result.status}: ${result.statusDetail || 'Please try again.'}`);
                      setLoading(false);
                      reject();
                    }
                  })
                  .catch(error => {
                    console.error('[MercadoPaymentModal] Error processing payment:', error);
                    setError('Error processing payment. Please try again.');
                    setLoading(false);
                    reject(error);
                  });
                });
              },
              onError: (error: any) => {
                console.error('[MercadoPaymentModal] Payment brick error:', error);
                setError('An error occurred with the payment processor. Please try again.');
                setLoading(false);
              }
            }
          }).then((controller: any) => {
            window.paymentBrickController = controller;
          }).catch((error: any) => {
            console.error('[MercadoPaymentModal] Error creating payment brick:', error);
            setError(`Error creating payment interface: ${error instanceof Error ? error.message : String(error)}`);
            setLoading(false);
          });
        }, 1000); // Give the DOM more time to render
        
      } catch (error) {
        console.error('[MercadoPaymentModal] Error:', error);
        setError('Failed to initialize payment');
        setLoading(false);
      }
    };
    
    initializePayment();
  }, [isOpen, paymentEnabled, mpScriptLoaded, hedgeData, currency, onSuccess, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Processing your payment...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
        
        {!loading && !error && (
          <>
            {paymentEnabled ? (
              <>
                {/* Payment container - Mercado Pago will render the payment form here */}
                <div 
                  id={paymentContainerId}
                  ref={paymentContainerRef}
                  className="min-h-[300px] border border-gray-200 rounded-md p-4"
                >
                  <div className="flex flex-col items-center justify-center h-full py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Loading payment interface...</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-4 w-full" 
                  onClick={() => {
                    console.log("[MercadoPaymentModal] Manual payment test button clicked");
                    // This simulates a successful payment for testing
                    if (hedgeData) {
                      onSuccess(hedgeData);
                      toast({
                        title: 'Test payment processed',
                        description: 'Your hedge order has been placed.',
                        variant: 'default',
                      });
                      onClose();
                    }
                  }}
                >
                  Test: Continue without payment
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="mb-4">Payment processing is disabled in this environment.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  In a production environment, you would complete payment before placing your hedge.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-2" 
                  onClick={() => {
                    if (hedgeData) {
                      onSuccess(hedgeData);
                      onClose();
                    }
                  }}
                >
                  Continue without payment
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}