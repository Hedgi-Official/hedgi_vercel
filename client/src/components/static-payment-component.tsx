import { useEffect, useRef, useState, memo } from 'react';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Helper function for translations based on currency
const getTranslation = (currency: string, texts: { EN: string, PT: string, ES: string }): string => {
  if (currency === 'BRL') return texts.PT;
  if (currency === 'MXN') return texts.ES;
  return texts.EN;
};

// Define the Mercado Pago types based on their SDK
declare global {
  interface Window {
    MercadoPago: any;
    paymentBrickController: any;
  }
}

interface StaticPaymentComponentProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  currency: string;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

// This component is memoized and will not re-render when parent state changes
const StaticPaymentComponent = memo(({ hedgeData, currency, onSuccess, onClose }: StaticPaymentComponentProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const brickContainerRef = useRef<HTMLDivElement>(null);
  const paymentBrickControllerRef = useRef<any>(null);
  
  // Track initialization attempts
  const initializationAttemptsRef = useRef(0);
  
  // Calculate payment amount only once
  const hedgeAmount = Math.abs(Number(hedgeData.amount));
  const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
  const paymentAmount = Number((hedgeCost).toFixed(2));
  
  // Check if payments are enabled
  useEffect(() => {
    async function checkPaymentStatus() {
      try {
        console.log('[StaticPayment] Checking payment status...');
        const response = await fetch('/api/payment/status');
        const data = await response.json();
        console.log('[StaticPayment] Payment status response:', data);
        setPaymentEnabled(data.enabled);
        
        if (!data.enabled) {
          console.log('[StaticPayment] Payments are disabled');
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
        }
      } catch (error) {
        console.error('[StaticPayment] Error checking payment status:', error);
        setError('Failed to check payment status');
        setLoading(false);
      }
    }

    checkPaymentStatus();
    
    // Clean up function to run on unmount
    return () => {
      if (paymentBrickControllerRef.current) {
        try {
          paymentBrickControllerRef.current.unmount();
          paymentBrickControllerRef.current = null;
        } catch (e) {
          console.error('[StaticPayment] Error unmounting payment brick:', e);
        }
      }
    };
  }, []);

  // Create payment preference once
  useEffect(() => {
    async function createPaymentPreference() {
      try {
        console.log('[StaticPayment] Creating payment preference');
        setLoading(true);
        setError(null);
        
        console.log('[StaticPayment] Payment amount:', paymentAmount);
        
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
                type: currency === 'MXN' ? 'RFC' : 'CPF',
                number: currency === 'MXN' ? 'XAXX010101000' : '219585466'
              }
            },
          }),
        });
        
        const data = await response.json();
        
        if (data.enabled === false) {
          console.log('[StaticPayment] Payments disabled response received');
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
          return;
        }
        
        if (!data.id) {
          throw new Error('No preference ID returned');
        }
        
        console.log('[StaticPayment] Preference created:', data);
        setPreferenceId(data.id);
        
        // Load Mercado Pago SDK only once
        if (window.MercadoPago) {
          console.log('[StaticPayment] MercadoPago already loaded, initializing...');
          const mp = new window.MercadoPago(data.public_key, {
            locale: currency === 'BRL' ? 'pt-BR' : 'es-MX'
          });
          
          const bricksBuilder = mp.bricks();
          renderPaymentBrick(bricksBuilder, data.id);
        } else {
          console.log('[StaticPayment] Loading MercadoPago script...');
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          
          script.onload = () => {
            console.log('[StaticPayment] MercadoPago script loaded successfully');
            const mp = new window.MercadoPago(data.public_key, {
              locale: currency === 'BRL' ? 'pt-BR' : 'es-MX'
            });
            
            const bricksBuilder = mp.bricks();
            renderPaymentBrick(bricksBuilder, data.id);
          };
          
          script.onerror = (error) => {
            console.error('[StaticPayment] Error loading MercadoPago script:', error);
            setError('Failed to load payment processor. Please try again or use the test option.');
            setLoading(false);
          };
          
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('[StaticPayment] Error creating payment preference:', error);
        setError('Failed to initialize payment. Please use the test option below.');
        setLoading(false);
      }
    }

    if (paymentEnabled && !preferenceId) {
      createPaymentPreference();
    }
  }, [paymentEnabled, hedgeAmount, hedgeData, currency, paymentAmount, preferenceId]);

  // Render the payment brick - this function is called only once
  const renderPaymentBrick = async (bricksBuilder: any, prefId: string) => {
    try {
      // Don't continue if we've tried too many times
      if (initializationAttemptsRef.current >= 2) {
        setError('Unable to initialize payment system after multiple attempts. Please use the test option instead.');
        setLoading(false);
        return;
      }
      
      initializationAttemptsRef.current += 1;
      console.log('[StaticPayment] Rendering payment brick (attempt ' + initializationAttemptsRef.current + ')');
      
      if (!brickContainerRef.current) {
        console.error('[StaticPayment] Container not found');
        setError('Payment container not found. Please use the test option.');
        setLoading(false);
        return;
      }
      
      // Create a settings object that won't change
      const settings = {
        initialization: {
          amount: paymentAmount,
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
            console.log('[StaticPayment] Payment brick ready');
            setLoading(false);
          },
          onSubmit: (formData: any) => {
            console.log('[StaticPayment] Payment submitted:', formData);
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
                console.log('[StaticPayment] Payment process result:', result);
                
                if (result.status === 'approved' || result.status === 'in_process') {
                  onSuccess(hedgeData);
                  // Use appropriate language based on currency
                  const translations = {
                    title: {
                      MXN: 'Pago exitoso',
                      BRL: 'Pagamento bem-sucedido',
                      default: 'Payment successful'
                    },
                    description: {
                      MXN: 'Tu orden de cobertura ha sido colocada.',
                      BRL: 'Seu pedido de hedge foi realizado com sucesso.',
                      default: 'Your hedge order has been placed.'
                    }
                  };
                  
                  toast({
                    title: translations.title[currency as keyof typeof translations.title] || translations.title.default,
                    description: translations.description[currency as keyof typeof translations.description] || translations.description.default,
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
                console.error('[StaticPayment] Error processing payment:', error);
                setError('Error processing payment. Please try again or use the test option.');
                setLoading(false);
                reject(error);
              });
            });
          },
          onError: (error: any) => {
            console.error('[StaticPayment] Payment brick error:', error);
            setError('An error occurred with the payment processor. Please use the test option below.');
            setLoading(false);
          }
        }
      };
      
      try {
        // Create the payment brick only once with reference to a static settings object
        window.paymentBrickController = await bricksBuilder.create(
          'payment',
          'paymentBrick_container',
          settings
        );
        
        // Also store in our ref for React component lifecycle management
        paymentBrickControllerRef.current = window.paymentBrickController;
        console.log('[StaticPayment] Payment brick created successfully');
      } catch (brickError) {
        console.error('[StaticPayment] Error creating payment brick:', brickError);
        setError('Unable to initialize payment system. Please use the test option below.');
        setLoading(false);
      }
    } catch (error) {
      console.error('[StaticPayment] Error in renderPaymentBrick:', error);
      setError('Error creating payment interface. Please use the test option below.');
      setLoading(false);
    }
  };

  return (
    <div className="py-2">
      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>{getTranslation(currency, {
            EN: 'Processing your payment...',
            PT: 'Processando seu pagamento...',
            ES: 'Procesando tu pago...'
          })}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
          <p className="font-semibold">Error Processing Payment</p>
          <p>{error}</p>
          
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              To proceed with testing, you can use the test option below.
            </p>
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => {
                console.log("[StaticPayment] Manual payment test button clicked");
                onSuccess(hedgeData);
                toast({
                  title: 'Test payment processed',
                  description: 'Your hedge order has been placed.',
                  variant: 'default',
                });
                onClose();
              }}
            >
              Continue with Test Payment
            </Button>
            
            <Button 
              variant="outline" 
              className="mt-2 w-full" 
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {!loading && !error && (
        <>
          <div 
            id="paymentBrick_container" 
            ref={brickContainerRef} 
            className="min-h-[300px]"
          />
          
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              If you're having trouble with the payment system, you can use the test option.
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                console.log("[StaticPayment] Manual payment test button clicked");
                onSuccess(hedgeData);
                toast({
                  title: 'Test payment processed',
                  description: 'Your hedge order has been placed.',
                  variant: 'default',
                });
                onClose();
              }}
            >
              Test: Continue without payment
            </Button>
          </div>
        </>
      )}
    </div>
  );
});

StaticPaymentComponent.displayName = 'StaticPaymentComponent';

export default StaticPaymentComponent;