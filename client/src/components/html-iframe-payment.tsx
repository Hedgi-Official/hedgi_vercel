import { useState, useEffect, useRef } from 'react';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface HtmlIframePaymentProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  currency: string;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

/**
 * HTML Iframe Payment Component
 * Uses a standalone HTML page loaded in an iframe for payment processing.
 * This approach completely isolates the Mercado Pago integration from React's
 * render cycle, ensuring it won't be affected by React updates.
 */
export default function HtmlIframePayment({ hedgeData, currency, onSuccess, onClose }: HtmlIframePaymentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Create a payment preference when the component mounts
  useEffect(() => {
    let mounted = true;
    const messageListener = (event: MessageEvent) => {
      // Handle messages from the iframe
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'PAYMENT_SUCCESS') {
          console.log('Payment success message received from iframe');
          toast({
            title: 'Payment Successful',
            description: 'Your hedge has been placed successfully.',
            variant: 'default',
          });
          onSuccess(hedgeData);
        } else if (event.data.type === 'CLOSE_PAYMENT_MODAL') {
          console.log('Close modal message received from iframe');
          onClose();
        }
      }
    };
    
    // Add message listener
    window.addEventListener('message', messageListener);
    
    async function createPaymentPreference() {
      try {
        // Calculate the payment amount (0.25% of hedge amount)
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025;
        const paymentAmount = Number(hedgeCost.toFixed(2));
        
        console.log('[HtmlIframePayment] Creating payment preference');
        
        const response = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmount,
            currency: currency,
            description: `Hedge for ${hedgeAmount} ${hedgeData.baseCurrency}${hedgeData.targetCurrency}`,
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
        
        if (!data.id || !data.public_key) {
          throw new Error('Missing preference ID or public key');
        }
        
        // Create URL with query parameters for the iframe
        const url = new URL('/payment.html', window.location.origin);
        url.searchParams.append('publicKey', data.public_key);
        url.searchParams.append('preferenceId', data.id);
        url.searchParams.append('hedgeId', 'test-hedge-123'); // This would normally be a real ID
        
        setIframeUrl(url.toString());
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error('[HtmlIframePayment] Error creating payment preference:', error);
        setError('Failed to initialize payment. Please try again or use the test option.');
        setLoading(false);
      }
    }
    
    createPaymentPreference();
    
    return () => {
      mounted = false;
      window.removeEventListener('message', messageListener);
    };
  }, []); // Empty dependency array - only run on mount
  
  // Handle test payment
  const handleTestPayment = () => {
    console.log("[HtmlIframePayment] Test payment selected");
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
            <button 
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90"
              onClick={handleTestPayment}
            >
              Continue with Test Payment
            </button>
            
            <button 
              className="mt-2 w-full border border-input bg-background py-2 px-4 rounded-md hover:bg-accent"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {!loading && !error && iframeUrl && (
        <div className="min-h-[500px] mb-4">
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            width="100%"
            height="500"
            frameBorder="0"
            title="Mercado Pago Payment"
            className="w-full border rounded-md"
          />
        </div>
      )}
    </div>
  );
}