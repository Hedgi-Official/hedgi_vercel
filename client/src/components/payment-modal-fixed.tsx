import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getIdentificationForCurrency, getLocaleForCurrency } from '../utils/payment-utils';

// Define the Mercado Pago types based on their SDK
declare global {
  interface Window {
    MercadoPago: any;
    paymentBrickController: any; // Added to match Mercado Pago example
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
          setError(null);
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
              identification: getIdentificationForCurrency(currency)
            },
          }),
        });
        
        const data = await response.json();
        
        if (data.enabled === false) {
          // If payments are disabled, show error
          console.log('[PaymentModal] Payments disabled response received');
          setError(null);
          setLoading(false);
          return;
        }
        
        if (!data.id) {
          throw new Error('No preference ID returned');
        }
        
        setPreferenceId(data.id);
        
        // Load the Mercado Pago SDK and initialize the payment brick
        if (!window.MercadoPago) {
          console.log('[PaymentModal] Loading MercadoPago SDK...');
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.async = true;
          script.onload = () => {
            console.log('[PaymentModal] MercadoPago script loaded');
            initializePayment(data.public_key, data.id, paymentAmount);
          };
          script.onerror = () => {
            setError('Failed to load payment processor. Please try again.');
            setLoading(false);
          };
          document.head.appendChild(script);
        } else {
          console.log('[PaymentModal] MercadoPago already loaded');
          initializePayment(data.public_key, data.id, paymentAmount);
        }
      } catch (error) {
        console.error('[PaymentModal] Error creating payment preference:', error);
        setError('Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    }
    
    if (isOpen && hedgeData && paymentEnabled) {
      createPaymentPreference();
    }
  }, [isOpen, hedgeData, paymentEnabled, currency]);

  // Initialize the payment with Mercado Pago
  const initializePayment = (publicKey: string, prefId: string, amount: number) => {
    if (!brickContainerRef.current) {
      console.error('[PaymentModal] Payment container not found');
      setError('Payment container not found. Please try again.');
      setLoading(false);
      return;
    }
    
    try {
      console.log('[PaymentModal] Initializing payment with public key:', publicKey);
      const mp = new window.MercadoPago(publicKey, {
        locale: getLocaleForCurrency(currency)
      });
      
      const bricksBuilder = mp.bricks();
      
      const renderPaymentBrick = async () => {
        const settings = {
          initialization: {
            amount: amount,
            preferenceId: prefId,
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
              console.log('[PaymentModal] Payment brick ready');
              setLoading(false);
            },
            onSubmit: (formData: any) => {
              console.log('[PaymentModal] Payment submitted:', formData);
              setLoading(true);
              
              return new Promise((resolve, reject) => {
                fetch('/api/payment/process', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    preferenceId: prefId,
                    currency: currency,
                    formData: formData
                  }),
                })
                .then(response => response.json())
                .then(result => {
                  console.log('[PaymentModal] Payment process result:', result);
                  
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
                  console.error('[PaymentModal] Error processing payment:', error);
                  setError('Error processing payment. Please try again.');
                  setLoading(false);
                  reject(error);
                });
              });
            },
            onError: (error: any) => {
              console.error('[PaymentModal] Payment brick error:', error);
              setError('An error occurred with the payment processor. Please try again.');
              setLoading(false);
            }
          }
        };
        
        try {
          console.log('[PaymentModal] Creating payment brick...');
          window.paymentBrickController = await bricksBuilder.create(
            'payment', 
            'paymentBrick_container', 
            settings
          );
          paymentBrickControllerRef.current = window.paymentBrickController;
          console.log('[PaymentModal] Payment brick created successfully');
        } catch (error) {
          console.error('[PaymentModal] Error creating payment brick:', error);
          setError(`Error creating payment interface: ${error instanceof Error ? error.message : String(error)}`);
          setLoading(false);
        }
      };
      
      renderPaymentBrick();
    } catch (error) {
      console.error('[PaymentModal] Error initializing MercadoPago:', error);
      setError('Failed to initialize payment processor. Please try again.');
      setLoading(false);
    }
  };

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
              <>
                <div 
                  id="paymentBrick_container" 
                  ref={brickContainerRef} 
                  className="min-h-[300px]"
                />
                <Button 
                  variant="outline" 
                  className="mt-4 w-full" 
                  onClick={() => {
                    console.log("[PaymentModal] Manual payment test button clicked");
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