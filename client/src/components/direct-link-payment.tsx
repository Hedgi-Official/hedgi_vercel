import { useState, useEffect } from 'react';
import { Hedge } from '@db/schema';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DirectLinkPaymentProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  currency: string;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

/**
 * Direct Link Payment Component
 * This component creates a direct link to the Mercado Pago checkout page,
 * completely bypassing any issues with React rendering.
 */
export default function DirectLinkPayment({ hedgeData, currency, onSuccess, onClose }: DirectLinkPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  
  // Create a payment preference when the component mounts
  useEffect(() => {
    let mounted = true;
    
    async function createPaymentPreference() {
      try {
        // Calculate the payment amount (0.25% of hedge amount)
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025;
        const paymentAmount = Number(hedgeCost.toFixed(2));
        
        console.log('[DirectLinkPayment] Creating payment preference');
        
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
        
        if (!data.init_point) {
          throw new Error('Missing payment checkout URL');
        }
        
        // Store the direct checkout URL
        setCheckoutUrl(data.init_point);
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error('[DirectLinkPayment] Error creating payment preference:', error);
        setError('Failed to initialize payment. Please try again or use the test option.');
        setLoading(false);
      }
    }
    
    createPaymentPreference();
    
    // Set up message event listener to receive payment success/failure notifications
    const handleMessage = (event: MessageEvent) => {
      try {
        // Check if the message is from our payment callback page
        if (event.data && typeof event.data === 'object') {
          const data = event.data;
          
          if (data.type === 'PAYMENT_SUCCESS') {
            toast({
              title: 'Payment Successful',
              description: 'Your hedge has been placed.',
            });
            onSuccess(hedgeData);
            onClose();
          } else if (data.type === 'PAYMENT_FAILED') {
            toast({
              title: 'Payment Failed',
              description: 'There was an issue processing your payment.',
              variant: 'destructive',
            });
          }
        }
      } catch (e) {
        console.error('Error handling message:', e);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      mounted = false;
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  // Handle opening payment in a new window
  const openPaymentWindow = () => {
    if (!checkoutUrl) return;
    
    const width = 800;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      checkoutUrl,
      'MercadoPagoPayment',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };
  
  // Handle test payment
  const handleTestPayment = () => {
    console.log("[DirectLinkPayment] Test payment selected");
    onSuccess(hedgeData);
    toast({
      title: 'Test payment processed',
      description: 'Your hedge order has been placed.',
    });
    onClose();
  };
  
  return (
    <div className="p-4">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Preparing payment...</p>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
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
      ) : (
        <div className="rounded-md border p-5">
          <h3 className="text-lg font-medium mb-4">Complete Your Payment</h3>
          
          <p className="text-muted-foreground mb-6">
            Click the button below to open a secure payment window. After completing your payment, 
            your hedge will be automatically placed.
          </p>
          
          <div className="space-y-4">
            <Button 
              variant="default"
              size="lg"
              className="w-full"
              onClick={openPaymentWindow}
            >
              Open Payment Window
            </Button>
            
            <div className="text-xs text-muted-foreground text-center">
              You'll be redirected to Mercado Pago's secure payment platform
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                If you're having trouble with payments, you can use the test option:
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleTestPayment}
              >
                Continue with Test Payment
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full mt-2" 
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}