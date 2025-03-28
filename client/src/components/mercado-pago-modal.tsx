import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Define the Mercado Pago types based on their SDK
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

export function MercadoPaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if payments are enabled when component mounts
  useEffect(() => {
    async function checkPaymentStatus() {
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
    }

    if (isOpen) {
      checkPaymentStatus();
    }
  }, [isOpen]);

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

  // Create a payment preference when dialog opens and payments are enabled
  useEffect(() => {
    async function initializePayment() {
      if (!hedgeData || !paymentEnabled || !isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Calculate hedge cost based on amount
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
        const paymentAmount = Number((hedgeCost).toFixed(2));
        
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
        
        if (data.enabled === false) {
          setLoading(false);
          return;
        }
        
        if (!data.id) {
          throw new Error('No preference ID returned');
        }

        // We'll now follow exactly what the Mercado Pago example does
        console.log('[MercadoPaymentModal] Loading Mercado Pago SDK...');
        if (!window.MercadoPago) {
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.onload = () => {
            console.log('[MercadoPaymentModal] SDK loaded, initializing...');
            initializeMercadoPago(data.public_key, data.id, paymentAmount);
          };
          script.onerror = (e) => {
            console.error('[MercadoPaymentModal] Error loading SDK:', e);
            setError('Failed to load payment processor');
            setLoading(false);
          };
          document.head.appendChild(script);
        } else {
          console.log('[MercadoPaymentModal] SDK already loaded, initializing...');
          initializeMercadoPago(data.public_key, data.id, paymentAmount);
        }
      } catch (error) {
        console.error('[MercadoPaymentModal] Error:', error);
        setError('Failed to initialize payment');
        setLoading(false);
      }
    }
    
    initializePayment();
  }, [isOpen, paymentEnabled, hedgeData, currency]);

  // Initialize Mercado Pago with the payment preference
  function initializeMercadoPago(publicKey: string, preferenceId: string, amount: number) {
    try {
      // Create a new MercadoPago instance
      const mp = new window.MercadoPago(publicKey, {
        locale: currency === 'BRL' ? 'pt-BR' : 'es-MX'
      });
      
      const bricksBuilder = mp.bricks();
      
      // Define the renderPaymentBrick function
      const renderPaymentBrick = async () => {
        const settings = {
          initialization: {
            amount: amount,
            preferenceId: preferenceId,
          },
          customization: {
            visual: {
              style: {
                theme: 'default'
              }
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
                    preferenceId: preferenceId,
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
        };
        
        try {
          console.log('[MercadoPaymentModal] Creating payment brick...');
          // This is the exact code from the Mercado Pago example
          window.paymentBrickController = await bricksBuilder.create(
            'payment',
            'payment_brick_container', // Use the same ID as in our HTML
            settings
          );
        } catch (error) {
          console.error('[MercadoPaymentModal] Error creating payment brick:', error);
          setError(`Error creating payment interface: ${error instanceof Error ? error.message : String(error)}`);
          setLoading(false);
        }
      }
      
      // Call the renderPaymentBrick function
      try {
        renderPaymentBrick();
      } catch (error) {
        console.error('[MercadoPaymentModal] Error calling renderPaymentBrick:', error);
        setError(`Failed to render payment brick: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('[MercadoPaymentModal] Error initializing Mercado Pago:', error);
      setError('Failed to initialize payment processor');
      setLoading(false);
    }
  }

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
                {/* IMPORTANT: This div ID must match exactly what's in the renderPaymentBrick function */}
                <div 
                  id="payment_brick_container" 
                  ref={containerRef} 
                  className="min-h-[300px]"
                />
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