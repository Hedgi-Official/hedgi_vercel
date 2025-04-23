import { useState, useEffect, useRef } from 'react';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface MercadoIframeProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  currency: string;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

/**
 * Mercado Pago Iframe Component
 * This component creates an iframe that will isolate the Mercado Pago payment interface
 * from any React re-renders, preventing the continuous refresh issue
 */
export default function MercadoIframe({ hedgeData, currency, onSuccess, onClose }: MercadoIframeProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Calculate the payment amount
  const hedgeAmount = Math.abs(Number(hedgeData.amount));
  const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
  const paymentAmount = Number((hedgeCost).toFixed(2));
  
  // Create a payment preference when the component mounts
  useEffect(() => {
    let mounted = true;
    
    async function createPaymentPreference() {
      try {
        console.log('[MercadoIframe] Creating payment preference');
        
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
        
        if (!mounted) return;
        
        if (data.enabled === false) {
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
          return;
        }
        
        if (!data.id) {
          throw new Error('No preference ID returned');
        }
        
        // Use the init_point URL directly for the iframe
        if (data.init_point) {
          setIframeUrl(data.init_point);
          setLoading(false);
        } else {
          throw new Error('No payment URL returned');
        }
      } catch (error) {
        if (!mounted) return;
        console.error('[MercadoIframe] Error creating payment preference:', error);
        setError('Failed to initialize payment. Please use the test option.');
        setLoading(false);
      }
    }
    
    createPaymentPreference();
    
    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount
  
  // Handle iframe load events
  const handleIframeLoad = () => {
    setLoading(false);
    console.log('[MercadoIframe] Iframe loaded');
  };
  
  // Handle test payment
  const handleTestPayment = () => {
    console.log("[MercadoIframe] Test payment selected");
    onSuccess(hedgeData);
    toast({
      title: 'Test payment processed',
      description: 'Your hedge order has been placed.',
      variant: 'default',
    });
    onClose();
  };
  
  return (
    <div className="py-2">
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
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {!loading && !error && (
        <>
          {iframeUrl ? (
            <div className="min-h-[400px] mb-4">
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                width="100%"
                height="400"
                frameBorder="0"
                onLoad={handleIframeLoad}
                title="Mercado Pago Payment"
                className="w-full border rounded-md"
              />
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              Failed to load payment interface
            </div>
          )}
          
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
        </>
      )}
    </div>
  );
}