import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MercadoPagoBrickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentData: any) => void;
  amount: string;
  hedgeData: any;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function MercadoPagoBrickModal({ 
  isOpen, 
  onClose, 
  onPaymentSuccess, 
  amount, 
  hedgeData 
}: MercadoPagoBrickModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const brickRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadMercadoPagoSDK = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Mercado Pago SDK if not already loaded
        if (!window.MercadoPago) {
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.async = true;
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        // Get public key from server
        const response = await fetch('/api/mp-public-key');
        if (!response.ok) {
          throw new Error('Failed to get Mercado Pago public key');
        }
        const { publicKey } = await response.json();

        // Initialize Mercado Pago
        const mp = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });

        // Create payment preference
        const preferenceResponse = await fetch('/api/payment-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            hedgeData
          }),
        });

        if (!preferenceResponse.ok) {
          throw new Error('Failed to create payment preference');
        }

        const preference = await preferenceResponse.json();

        // Initialize Card Payment Brick
        if (containerRef.current) {
          const brickBuilder = mp.bricks();
          
          brickRef.current = await brickBuilder.create('cardPayment', containerRef.current, {
            initialization: {
              amount: parseFloat(amount),
              preferenceId: preference.id
            },
            customization: {
              visual: {
                style: {
                  customVariables: {
                    theme: 'default'
                  }
                }
              },
              paymentMethods: {
                creditCard: 'all',
                debitCard: 'all'
              }
            },
            callbacks: {
              onReady: () => {
                setIsLoading(false);
              },
              onSubmit: async (formData: any) => {
                setIsProcessing(true);
                try {
                  // Process payment through our backend
                  const paymentResponse = await fetch('/api/process-payment', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      ...formData,
                      hedgeData,
                      amount: parseFloat(amount)
                    }),
                  });

                  if (!paymentResponse.ok) {
                    throw new Error('Payment processing failed');
                  }

                  const paymentResult = await paymentResponse.json();
                  
                  if (paymentResult.status === 'approved') {
                    onPaymentSuccess(paymentResult);
                    onClose();
                  } else {
                    setError('Payment was not approved. Please try again.');
                  }
                } catch (error) {
                  console.error('Payment error:', error);
                  setError('Payment failed. Please try again.');
                } finally {
                  setIsProcessing(false);
                }
              },
              onError: (error: any) => {
                console.error('Brick error:', error);
                setError('Payment form error. Please refresh and try again.');
                setIsProcessing(false);
              }
            }
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load Mercado Pago:', error);
        setError('Failed to load payment form. Please try again.');
        setIsLoading(false);
      }
    };

    loadMercadoPagoSDK();

    // Cleanup function
    return () => {
      if (brickRef.current) {
        try {
          brickRef.current.unmount();
        } catch (error) {
          console.error('Error unmounting brick:', error);
        }
        brickRef.current = null;
      }
    };
  }, [isOpen, amount, hedgeData]);

  const handleClose = () => {
    if (brickRef.current) {
      try {
        brickRef.current.unmount();
      } catch (error) {
        console.error('Error unmounting brick:', error);
      }
      brickRef.current = null;
    }
    setError(null);
    setIsLoading(true);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Amount: R$ {parseFloat(amount).toFixed(2)}</p>
            <p>Hedge: {hedgeData?.baseCurrency}/{hedgeData?.targetCurrency}</p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading payment form...</span>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div 
            ref={containerRef} 
            id="cardPaymentBrick_container"
            className={isLoading ? 'hidden' : 'block'}
          />

          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2">Processing payment...</span>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}