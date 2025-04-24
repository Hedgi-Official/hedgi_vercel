import { useState, useEffect, useRef } from 'react';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getIdentificationForCurrency, getLocaleForCurrency } from '../utils/payment-utils';

// Define the Mercado Pago types based on their SDK
declare global {
  interface Window {
    MercadoPago: any;
    paymentBrickController: any;
  }
}

interface IsolatedPaymentBrickProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  currency: string;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

// The component that will be mounted only once and then completely isolated from parent re-renders
export default function IsolatedPaymentBrick(props: IsolatedPaymentBrickProps) {
  // Copy all props to internal state - this ensures we only use the initial props
  // and don't react to prop changes after initial mount
  const [internalProps] = useState({
    hedgeData: props.hedgeData,
    currency: props.currency,
    onSuccess: props.onSuccess,
    onClose: props.onClose
  });
  
  // Internal component state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const brickContainerRef = useRef<HTMLDivElement>(null);
  const paymentBrickControllerRef = useRef<any>(null);
  
  // Calculate values once and store them in refs
  const hedgeAmountRef = useRef(Math.abs(Number(internalProps.hedgeData.amount)));
  const hedgeCostRef = useRef(hedgeAmountRef.current * 0.0025); // 0.25% cost
  const paymentAmountRef = useRef(Number(hedgeCostRef.current.toFixed(2)));
  
  // Check payment status and create preference
  useEffect(() => {
    let isMounted = true;
    let mpScript: HTMLScriptElement | null = null;
    
    async function initialize() {
      try {
        // 1. Check if payments are enabled
        console.log('[IsolatedBrick] Checking payment status...');
        const statusResponse = await fetch('/api/payment/status');
        const statusData = await statusResponse.json();
        
        if (!isMounted) return;
        
        if (!statusData.enabled) {
          console.log('[IsolatedBrick] Payments are disabled');
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
          return;
        }
        
        setPaymentEnabled(true);
        
        // 2. Create a payment preference
        console.log('[IsolatedBrick] Creating payment preference...');
        const prefResponse = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmountRef.current,
            currency: internalProps.currency,
            description: `Hedge for ${hedgeAmountRef.current} ${internalProps.hedgeData.targetCurrency}${internalProps.hedgeData.baseCurrency}`,
            payer: {
              email: 'customer@example.com',
              name: 'Test Customer',
              identification: getIdentificationForCurrency(internalProps.currency)
            },
          }),
        });
        
        if (!isMounted) return;
        
        if (!prefResponse.ok) {
          setError('Failed to create payment preference');
          setLoading(false);
          return;
        }
        
        const prefData = await prefResponse.json();
        console.log('[IsolatedBrick] Preference created:', prefData);
        
        if (!isMounted) return;
        
        if (!prefData.id) {
          setError('No preference ID returned');
          setLoading(false);
          return;
        }
        
        setPreferenceId(prefData.id);
        
        // 3. Load the MercadoPago SDK
        if (!window.MercadoPago) {
          console.log('[IsolatedBrick] Loading MercadoPago script...');
          mpScript = document.createElement('script');
          mpScript.src = 'https://sdk.mercadopago.com/js/v2';
          
          mpScript.onload = () => {
            if (!isMounted) return;
            
            console.log('[IsolatedBrick] MercadoPago script loaded');
            renderPaymentBrick(prefData.public_key, prefData.id);
          };
          
          mpScript.onerror = () => {
            if (!isMounted) return;
            
            console.error('[IsolatedBrick] Failed to load MercadoPago script');
            setError('Failed to load payment processor');
            setLoading(false);
          };
          
          document.head.appendChild(mpScript);
        } else {
          console.log('[IsolatedBrick] MercadoPago already loaded');
          renderPaymentBrick(prefData.public_key, prefData.id);
        }
      } catch (err) {
        if (!isMounted) return;
        
        console.error('[IsolatedBrick] Error in initialization:', err);
        setError('Error initializing payment system. Please try again.');
        setLoading(false);
      }
    }
    
    // Call initialization
    initialize();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      if (mpScript && mpScript.parentNode) {
        mpScript.parentNode.removeChild(mpScript);
      }
      
      if (paymentBrickControllerRef.current) {
        try {
          paymentBrickControllerRef.current.unmount();
        } catch (e) {
          console.error('[IsolatedBrick] Error unmounting payment brick:', e);
        }
      }
    };
  }, []); // Empty dependency array - this effect runs only once on mount
  
  // Function to render the payment brick - this is called only once
  const renderPaymentBrick = (publicKey: string, prefId: string) => {
    try {
      if (!brickContainerRef.current) {
        console.error('[IsolatedBrick] Container not found');
        setError('Payment container not found');
        setLoading(false);
        return;
      }
      
      console.log('[IsolatedBrick] Rendering payment brick');
      
      // Create MercadoPago instance with the appropriate locale
      const mp = new window.MercadoPago(publicKey, {
        locale: getLocaleForCurrency(internalProps.currency)
      });
      
      // Create a new settings object that won't change
      const settings = {
        initialization: {
          amount: paymentAmountRef.current, // Use ref value that won't change
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
            console.log('[IsolatedBrick] Payment brick ready');
            setLoading(false);
          },
          onSubmit: (formData: any) => {
            console.log('[IsolatedBrick] Payment submitted:', formData);
            setLoading(true);
            
            return new Promise((resolve, reject) => {
              fetch('/api/payment/process', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  preferenceId: prefId,
                  currency: internalProps.currency,
                  formData: formData
                }),
              })
              .then(response => response.json())
              .then(result => {
                console.log('[IsolatedBrick] Payment process result:', result);
                
                if (result.status === 'approved' || result.status === 'in_process') {
                  internalProps.onSuccess(internalProps.hedgeData);
                  toast({
                    title: 'Payment successful',
                    description: 'Your hedge order has been placed.',
                    variant: 'default',
                  });
                  resolve(undefined);
                  internalProps.onClose();
                } else {
                  setError(`Payment ${result.status}: ${result.statusDetail || 'Please try again.'}`);
                  setLoading(false);
                  reject();
                }
              })
              .catch(error => {
                console.error('[IsolatedBrick] Error processing payment:', error);
                setError('Error processing payment. Please try again.');
                setLoading(false);
                reject(error);
              });
            });
          },
          onError: (error: any) => {
            console.error('[IsolatedBrick] Payment brick error:', error);
            if (error && error.cause && error.cause.includes('back_url.success')) {
              setError('The payment system requires additional configuration. Please use the test option below.');
            } else {
              setError('An error occurred with the payment processor. Please try again.');
            }
            setLoading(false);
          }
        }
      };
      
      // Create the payment brick
      mp.bricks().create('payment', 'paymentBrick_container', settings)
        .then((brick: any) => {
          console.log('[IsolatedBrick] Brick created successfully');
          // Store reference for cleanup
          paymentBrickControllerRef.current = brick;
          window.paymentBrickController = brick;
        })
        .catch((err: any) => {
          console.error('[IsolatedBrick] Error creating brick:', err);
          setError('Failed to initialize payment form. Please use the test option.');
          setLoading(false);
        });
        
    } catch (error) {
      console.error('[IsolatedBrick] Error in renderPaymentBrick:', error);
      setError('Error initializing payment system');
      setLoading(false);
    }
  };
  
  // Render the component
  return (
    <div className="py-2">
      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Processing your payment...</p>
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
                console.log("[IsolatedBrick] Manual payment test button clicked");
                internalProps.onSuccess(internalProps.hedgeData);
                toast({
                  title: 'Test payment processed',
                  description: 'Your hedge order has been placed.',
                  variant: 'default',
                });
                internalProps.onClose();
              }}
            >
              Continue with Test Payment
            </Button>
            
            <Button 
              variant="outline" 
              className="mt-2 w-full" 
              onClick={internalProps.onClose}
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
          
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2 text-center">
              If you're having trouble with payment, you can use the test option:
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                console.log("[IsolatedBrick] Manual payment test button clicked");
                internalProps.onSuccess(internalProps.hedgeData);
                toast({
                  title: 'Test payment processed',
                  description: 'Your hedge order has been placed.',
                  variant: 'default',
                });
                internalProps.onClose();
              }}
            >
              Continue with Test Payment
            </Button>
          </div>
        </>
      )}
    </div>
  );
}