import { useState, useEffect, useRef, memo } from 'react';
import { Hedge } from '@db/schema';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Declare the MercadoPago type to access it from the window object
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface StaticBrickProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  currency: string;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

// Since we're memoizing this component, we need to ensure the props don't change identity
// For callbacks, we'll accept and use refs to the functions instead
interface InternalProps extends Omit<StaticBrickProps, 'onSuccess' | 'onClose'> {
  onSuccessRef: React.MutableRefObject<StaticBrickProps['onSuccess']>;
  onCloseRef: React.MutableRefObject<StaticBrickProps['onClose']>;
  containerId: string;
}

/**
 * InnerStaticBrick Component
 * This is the internal memoized component that will never re-render
 * once it's mounted, regardless of parent component changes.
 */
const InnerStaticBrick = memo(function InnerStaticBrick({ 
  hedgeData, 
  currency, 
  onSuccessRef,
  onCloseRef,
  containerId
}: InternalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store all mutable state in refs
  const initialized = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const brickRef = useRef<any>(null);
  const hedgeDataRef = useRef(hedgeData);
  
  // Store the original hedgeData
  hedgeDataRef.current = hedgeData;
  
  // This effect runs exactly once, when the component first mounts
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    let isMounted = true;
    const capturedHedgeData = {...hedgeDataRef.current}; // Capture initial hedge data
    
    async function createPaymentPreference() {
      try {
        // Calculate the payment amount (0.25% of hedge amount)
        const hedgeAmount = Math.abs(Number(capturedHedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025;
        const paymentAmount = Number(hedgeCost.toFixed(2));
        
        console.log('[StaticBrick] Creating payment preference');
        
        const response = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmount,
            currency: currency,
            description: `Hedge for ${hedgeAmount} ${capturedHedgeData.baseCurrency}${capturedHedgeData.targetCurrency}`,
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
        
        if (!isMounted) return;
        
        const data = await response.json();
        
        if (data.enabled === false) {
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
          return;
        }
        
        if (!data.id || !data.public_key) {
          throw new Error('Missing preference ID or public key');
        }
        
        // Load MercadoPago SDK
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
          if (isMounted) initializeBrick(data.public_key, data.id);
        };
        script.onerror = () => {
          if (isMounted) {
            setError('Failed to load Mercado Pago SDK. Please try again later.');
            setLoading(false);
          }
        };
        
        document.body.appendChild(script);
      } catch (error) {
        if (!isMounted) return;
        console.error('[StaticBrick] Error creating payment preference:', error);
        setError('Failed to initialize payment. Please try again or use the test option.');
        setLoading(false);
      }
    }
    
    // Initialize the Mercado Pago brick
    function initializeBrick(publicKey: string, preferenceId: string) {
      try {
        if (!window.MercadoPago) {
          setError('Mercado Pago SDK not loaded. Please refresh and try again.');
          setLoading(false);
          return;
        }
        
        console.log('[StaticBrick] Initializing payment brick');
        
        // Initialize MercadoPago object
        const mp = new window.MercadoPago(publicKey);
        
        // Configure the brick settings
        const brickSettings = {
          initialization: {
            preferenceId: preferenceId
          },
          callbacks: {
            onReady: () => {
              console.log('[StaticBrick] Brick ready');
              setLoading(false);
            },
            onError: (error: any) => {
              console.error('[StaticBrick] Brick error:', error);
              setError(`Payment error: ${error.message || 'Unknown error'}`);
              setLoading(false);
            },
            onSubmit: () => {
              console.log('[StaticBrick] Payment submitted');
              // Could handle successful submission here
            }
          },
          locale: 'en',
          customization: {
            paymentMethods: {
              maxInstallments: 1
            },
            visual: {
              hidePaymentButton: false
            }
          }
        };
        
        // Create the brick using the unique ID that's passed in as a prop
        brickRef.current = mp.bricks().create('payment', containerId, brickSettings);
      } catch (error) {
        if (!isMounted) return;
        console.error('[StaticBrick] Error initializing brick:', error);
        setError('Failed to initialize payment interface. Please try again later.');
        setLoading(false);
      }
    }
    
    createPaymentPreference();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - this effect runs once and never again
  
  // Handle test payment
  const handleTestPayment = () => {
    console.log("[StaticBrick] Test payment selected");
    onSuccessRef.current(hedgeDataRef.current);
    toast({
      title: 'Test payment processed',
      description: 'Your hedge order has been placed.',
    });
    onCloseRef.current();
  };
  
  // Handle close
  const handleClose = () => {
    onCloseRef.current();
  };
  
  return (
    <div className="py-4">
      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Loading payment interface...</p>
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
              onClick={handleTestPayment}
            >
              Continue with Test Payment
            </Button>
            
            <Button 
              variant="outline" 
              className="mt-2 w-full" 
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {/* This div will contain the payment brick and will never be removed from the DOM */}
      <div 
        id={containerId} 
        ref={containerRef} 
        className={`min-h-[400px] rounded-md border ${loading || error ? 'hidden' : 'block'}`}
      />
      
      {!loading && !error && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2 text-center">
            If you're having trouble with the payment system, you can use the test option:
          </p>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleTestPayment}
          >
            Continue with Test Payment
          </Button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // This component never re-renders after it's mounted
  return true;
});

/**
 * Static Brick Component Wrapper
 * This wrapper creates refs for the callbacks and passes them to the memoized inner component
 * The inner component will never re-render, even if the props change.
 */
function StaticBrick(props: StaticBrickProps) {
  // Create refs to store the callback functions
  const onSuccessRef = useRef(props.onSuccess);
  const onCloseRef = useRef(props.onClose);
  
  // Keep the refs updated with the latest callbacks
  useEffect(() => {
    onSuccessRef.current = props.onSuccess;
    onCloseRef.current = props.onClose;
  }, [props.onSuccess, props.onClose]);
  
  // Generate a unique ID for the container that doesn't change between renders
  const [containerId] = useState(`payment-brick-${Math.random().toString(36).substring(2, 11)}`);
  
  // Render the memoized component that will never update
  return (
    <InnerStaticBrick
      hedgeData={props.hedgeData}
      currency={props.currency}
      onSuccessRef={onSuccessRef}
      onCloseRef={onCloseRef}
      containerId={containerId}
    />
  );
}

export default memo(StaticBrick);