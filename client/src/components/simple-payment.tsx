
import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import type { Hedge } from '@db/schema';

interface SimplePaymentProps {
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onClose: () => void;
}

export function SimplePayment({ hedgeData, onSuccess, onClose }: SimplePaymentProps) {
  const { toast } = useToast();
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const paymentWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    // Listen for messages from the payment window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PAYMENT_SUCCESS') {
        console.log('Payment success received:', event.data);
        
        // Close the payment window
        if (paymentWindowRef.current) {
          paymentWindowRef.current.close();
          paymentWindowRef.current = null;
        }
        
        setIsWindowOpen(false);
        
        // Call success handler
        onSuccess(hedgeData);
        
        toast({
          title: "Payment Successful",
          description: "Your hedge has been placed successfully!",
        });
      } else if (event.data.type === 'PAYMENT_FAILED') {
        console.log('Payment failed:', event.data);
        
        // Close the payment window
        if (paymentWindowRef.current) {
          paymentWindowRef.current.close();
          paymentWindowRef.current = null;
        }
        
        setIsWindowOpen(false);
        
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      
      // Clean up window reference
      if (paymentWindowRef.current) {
        paymentWindowRef.current.close();
        paymentWindowRef.current = null;
      }
    };
  }, [hedgeData, onSuccess, toast]);

  const openPaymentWindow = () => {
    // Build the URL with hedge data as query parameters
    const baseUrl = '/payment-brl.html'; // Use BRL by default, or determine based on currency
    const url = new URL(baseUrl, window.location.origin);
    
    // Add all hedge data as query parameters
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
    
    console.log('[SimplePayment] Opening payment window with URL:', url.toString());
    
    // Open the window
    const newWindow = window.open(
      url.toString(),
      'HedgiPayment',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
    
    // Store window reference and update state
    if (newWindow) {
      paymentWindowRef.current = newWindow;
      setIsWindowOpen(true);
      
      // Check if window is closed manually
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed);
          setIsWindowOpen(false);
          paymentWindowRef.current = null;
        }
      }, 1000);
    } else {
      toast({
        title: 'Payment Error',
        description: 'Unable to open payment window. Please check your pop-up blocker settings.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="py-4">
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Payment Details:</h3>
        <div className="text-sm space-y-1">
          <p>Currency: {hedgeData.baseCurrency}</p>
          <p>Hedge Amount: {hedgeData.amount}</p>
          <p>Duration: {hedgeData.duration} days</p>
        </div>
      </div>

      <div className="space-y-4">
        <Button 
          onClick={openPaymentWindow}
          className="w-full"
          size="lg"
          disabled={isWindowOpen}
        >
          {isWindowOpen ? 'Payment Window Open...' : 'Open Payment Window'}
        </Button>
        
        {isWindowOpen && (
          <p className="text-sm text-muted-foreground text-center">
            Complete your payment in the new window. Keep it open until payment is complete.
          </p>
        )}

        <Button 
          variant="outline" 
          onClick={onClose}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
