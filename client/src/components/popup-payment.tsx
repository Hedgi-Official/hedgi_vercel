import { useState, useEffect, useCallback } from 'react';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface PopupPaymentProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  currency: string;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

/**
 * Popup Payment Component
 * Uses a completely separate browser window for payment processing.
 * This approach guarantees isolation from React's render cycle.
 */
export default function PopupPayment({ hedgeData, currency, onSuccess, onClose }: PopupPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferenceData, setPreferenceData] = useState<{id: string, public_key: string, init_point: string} | null>(null);
  
  // Create a payment preference when the component mounts
  useEffect(() => {
    let mounted = true;
    
    async function createPaymentPreference() {
      try {
        // Calculate the payment amount (0.25% of hedge amount)
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025;
        const paymentAmount = Number(hedgeCost.toFixed(2));
        
        console.log('[PopupPayment] Creating payment preference');
        
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
        
        if (!data.id || !data.public_key || !data.init_point) {
          throw new Error('Missing preference data');
        }
        
        setPreferenceData(data);
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error('[PopupPayment] Error creating payment preference:', error);
        setError('Failed to initialize payment. Please try again or use the test option.');
        setLoading(false);
      }
    }
    
    createPaymentPreference();
    
    // Setup message listener for the popup window
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'PAYMENT_SUCCESS') {
          toast({
            title: 'Payment Successful',
            description: 'Your hedge has been placed successfully.',
          });
          onSuccess(hedgeData);
          onClose();
        } else if (event.data.type === 'PAYMENT_FAILED' || event.data.type === 'PAYMENT_PENDING') {
          // Could handle these differently if needed
          console.log(`Payment status: ${event.data.type}`);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      mounted = false;
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty dependency array - only run on mount
  
  // Open the payment in a popup window
  const openPaymentPopup = useCallback(() => {
    if (!preferenceData) return;
    
    const width = 700;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Open the payment URL directly
    window.open(
      preferenceData.init_point,
      'MercadoPagoPayment',
      `width=${width},height=${height},left=${left},top=${top},location=yes,menubar=no,toolbar=no,status=no`
    );
  }, [preferenceData]);
  
  // Handle test payment
  const handleTestPayment = () => {
    console.log("[PopupPayment] Test payment selected");
    onSuccess(hedgeData);
    toast({
      title: 'Test payment processed',
      description: 'Your hedge order has been placed.',
    });
    onClose();
  };
  
  return (
    <div className="py-4 px-2">
      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Preparing payment...</p>
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
      
      {!loading && !error && preferenceData && (
        <div className="flex flex-col items-center">
          <div className="bg-muted p-5 rounded-md mb-6 w-full">
            <h3 className="text-lg font-medium mb-2">Ready to complete your payment</h3>
            <p className="text-muted-foreground mb-4">
              Click the button below to open the secure payment window.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button 
                className="w-full" 
                size="lg"
                onClick={openPaymentPopup}
              >
                Open Payment Window
              </Button>
              
              <p className="text-xs text-muted-foreground mt-2 text-center">
                A new window will open to process your payment securely.
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t w-full">
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
          </div>
        </div>
      )}
    </div>
  );
}