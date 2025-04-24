import { useState, useEffect, useRef } from 'react';
import { Hedge } from '@db/schema';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface StandaloneWindowPaymentProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

/**
 * Standalone Window Payment Component
 * 
 * This component opens a new window containing a completely standalone payment page.
 * The payment page operates entirely independently of React's render cycle,
 * ensuring that it won't be refreshed when exchange rates update.
 */
export default function StandaloneWindowPayment({ 
  hedgeData, 
  onSuccess, 
  onClose 
}: StandaloneWindowPaymentProps) {
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const paymentWindowRef = useRef<Window | null>(null);
  
  // Set up window message listener when component mounts
  useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      // Handle messages from the standalone payment window
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'PAYMENT_SUCCESS') {
          console.log('[StandaloneWindowPayment] Payment success message received');
          toast({
            title: 'Payment Successful',
            description: 'Your hedge has been placed successfully.',
            variant: 'default',
          });
          // Pass the hedge data back to the parent component
          onSuccess(hedgeData);
        }
      }
    };
    
    // Add message listener
    window.addEventListener('message', messageListener);
    
    // Clean up listener when component unmounts
    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, [hedgeData, onSuccess]);
  
  // Monitor for window close
  useEffect(() => {
    if (!isWindowOpen || !paymentWindowRef.current) return;
    
    // Check every 500ms if the window is still open
    const checkWindow = setInterval(() => {
      if (paymentWindowRef.current && paymentWindowRef.current.closed) {
        console.log('[StandaloneWindowPayment] Payment window was closed');
        clearInterval(checkWindow);
        setIsWindowOpen(false);
        onClose();
      }
    }, 500);
    
    return () => {
      clearInterval(checkWindow);
    };
  }, [isWindowOpen, onClose]);
  
  // Open payment window
  const openPaymentWindow = () => {
    if (isWindowOpen && paymentWindowRef.current && !paymentWindowRef.current.closed) {
      // Focus existing window if it's already open
      paymentWindowRef.current.focus();
      return;
    }
    
    // Check currency to determine which payment page to use
    const usesMXN = hedgeData.baseCurrency === 'MXN';
    
    // Create URL with all hedge data as parameters
    // Use fixed payment page which handles all currencies properly
    const url = new URL(
      '/standalone-payment-fixed.html', 
      window.location.origin
    );
    
    // Add all hedge data as URL parameters
    Object.entries(hedgeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });
    
    // Open the window with specific dimensions
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Log which payment page is being used
    console.log(`[StandaloneWindowPayment] Opening ${usesMXN ? 'MXN' : 'standard'} payment window`);
    
    // Open the window
    const newWindow = window.open(
      url.toString(),
      'HedgiPayment',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Store window reference and update state
    if (newWindow) {
      paymentWindowRef.current = newWindow;
      setIsWindowOpen(true);
    } else {
      toast({
        title: 'Payment Error',
        description: 'Unable to open payment window. Please check your pop-up blocker settings.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="py-4 flex flex-col items-center">
      <p className="text-center mb-4">
        Click the button below to open the payment window. 
        Keep the window open until your payment is complete.
      </p>
      
      <Button 
        onClick={openPaymentWindow}
        className="w-full"
        size="lg"
      >
        Open Payment Window
      </Button>
      
      {isWindowOpen && (
        <p className="text-sm text-muted-foreground mt-4">
          Payment window is open. Complete your payment to continue.
        </p>
      )}
    </div>
  );
}