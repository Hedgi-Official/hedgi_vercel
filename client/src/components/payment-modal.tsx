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
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

export function PaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const brickContainerRef = useRef<HTMLDivElement>(null);
  const paymentBrickControllerRef = useRef<any>(null);

  // Check if payments are enabled when the component mounts
  useEffect(() => {
    async function checkPaymentStatus() {
      try {
        console.log('[PaymentModal] Checking payment status...');
        const response = await fetch('/api/payment/status');
        const data = await response.json();
        console.log('[PaymentModal] Payment status response:', data);
        setPaymentEnabled(data.enabled);
        
        if (!data.enabled) {
          // If payments are disabled, inform the user that payments are off
          console.log('[PaymentModal] Payments are disabled');
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
        } else {
          console.log('[PaymentModal] Payments enabled, proceeding to create preference');
        }
      } catch (error) {
        console.error('[PaymentModal] Error checking payment status:', error);
        setError('Failed to check payment status');
        setLoading(false);
      }
    }

    if (isOpen && hedgeData) {
      console.log('[PaymentModal] Modal opened with hedge data:', hedgeData);
      checkPaymentStatus();
    }
  }, [isOpen, hedgeData]);

  // Create a payment preference when the modal opens and payments are enabled
  useEffect(() => {
    async function createPaymentPreference() {
      if (!hedgeData) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Calculate the payment amount based on hedge cost
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
        const paymentAmount = Number((hedgeCost).toFixed(2));
        
        const response = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmount,
            currency: currency,
            description: `Hedge for ${hedgeAmount} ${hedgeData.targetCurrency}${hedgeData.baseCurrency}`,
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
          // If payments are disabled, show error
          console.log('[PaymentModal] Payments disabled response received');
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
          return;
        }
        
        if (!data.id) {
          throw new Error('No preference ID returned');
        }
        
        setPreferenceId(data.id);
        loadMercadoPago(data.public_key, data.id);
      } catch (error) {
        console.error('Error creating payment preference:', error);
        setError('Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    }
    
    if (isOpen && hedgeData && paymentEnabled) {
      createPaymentPreference();
    }
  }, [isOpen, hedgeData, paymentEnabled, currency]);

  // Load the Mercado Pago SDK
  const loadMercadoPago = (publicKey: string, prefId: string) => {
    // Only proceed if payments are enabled
    if (!paymentEnabled) return;
    
    // Load the Mercado Pago script if not already loaded
    if (!window.MercadoPago) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = () => {
        initializeMercadoPago(publicKey, prefId);
      };
      script.onerror = () => {
        setError('Failed to load payment processor. Please try again.');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initializeMercadoPago(publicKey, prefId);
    }
  };

  // Initialize Mercado Pago with the payment brick
  const initializeMercadoPago = (publicKey: string, prefId: string) => {
    try {
      const mp = new window.MercadoPago(publicKey, {
        locale: currency === 'BRL' ? 'pt-BR' : 'es-MX'
      });
      
      const bricksBuilder = mp.bricks();
      
      const renderPaymentBrick = async () => {
        if (!brickContainerRef.current) return;
        
        const settings = {
          initialization: {
            preferenceId: prefId,
          },
          customization: {
            visual: {
              style: {
                theme: 'default'
              }
            },
            paymentMethods: {
              maxInstallments: 1
            }
          },
          callbacks: {
            onReady: () => {
              setLoading(false);
            },
            onSubmit: async (formData: any) => {
              setLoading(true);
              
              try {
                // Process the payment on our backend
                const response = await fetch('/api/payment/process', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    preferenceId: prefId,
                    currency: currency,
                    formData
                  }),
                });
                
                const result = await response.json();
                
                if (result.status === 'approved' || result.status === 'in_process') {
                  // If payment is approved or in process, proceed with the hedge
                  if (hedgeData) {
                    onSuccess(hedgeData);
                  }
                  toast({
                    title: 'Payment successful',
                    description: 'Your hedge order has been placed.',
                    variant: 'default',
                  });
                  onClose();
                } else {
                  setError(`Payment ${result.status}: ${result.statusDetail || 'Please try again.'}`);
                  setLoading(false);
                }
              } catch (error) {
                console.error('Error processing payment:', error);
                setError('Error processing payment. Please try again.');
                setLoading(false);
              }
            },
            onError: (error: any) => {
              console.error('Payment brick error:', error);
              setError('An error occurred with the payment processor. Please try again.');
              setLoading(false);
            }
          }
        };
        
        paymentBrickControllerRef.current = await bricksBuilder.create(
          'payment',
          brickContainerRef.current.id,
          settings
        );
      };
      
      renderPaymentBrick();
    } catch (error) {
      console.error('Error initializing Mercado Pago:', error);
      setError('Failed to initialize payment processor. Please try again.');
      setLoading(false);
    }
  };

  // No simulation function needed anymore, as we're using real Mercado Pago or no payments at all

  // Clean up when the component unmounts
  useEffect(() => {
    return () => {
      if (paymentBrickControllerRef.current) {
        try {
          paymentBrickControllerRef.current.unmount();
        } catch (e) {
          console.error('Error unmounting payment brick:', e);
        }
      }
    };
  }, []);

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
              <div 
                id="payment-brick-container" 
                ref={brickContainerRef} 
                className="min-h-[300px]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="mb-4">Payment processing is disabled in this environment.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  In a production environment, you would complete payment before placing your hedge.
                </p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}