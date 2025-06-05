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

    const openFlaskBrickWindow = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Add a small delay to ensure the modal is fully rendered before opening popup
        setTimeout(() => {
          // Directly open Flask brick endpoint in a new popup window
          const flaskUrl = `http://3.145.164.47/payment?amount=${amount}`;
          
          console.log('[MercadoPago Modal] Opening Flask brick window:', flaskUrl);
          
          // Open popup window with specific dimensions
          const width = 600;
          const height = 700;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          
          const popupWindow = window.open(
            flaskUrl,
            'MercadoPagoBrick',
            `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no,titlebar=no`
          );

          if (!popupWindow) {
            setError('Popup blocked. Please allow popups for this site.');
            setIsLoading(false);
            return;
          }

          console.log('[MercadoPago Modal] Popup window opened successfully');

          // Listen for payment completion messages from popup
          const messageHandler = (event: MessageEvent) => {
            console.log('[MercadoPago Modal] Received message:', event);
            
            // Accept messages from Flask server
            if (event.origin !== 'http://3.145.164.47') {
              console.log('[MercadoPago Modal] Ignoring message from origin:', event.origin);
              return;
            }
            
            // Handle different Flask response formats
            if (event.data.type === 'PAYMENT_SUCCESS' || event.data.status === 'approved') {
              console.log('[MercadoPago Modal] Payment success received');
              
              // Extract payment data from Flask response
              const paymentResult = {
                id: event.data.id || event.data.paymentId || `mp_${Date.now()}`,
                status: 'approved',
                message: event.data.message || 'Payment processed successfully'
              };
              
              // Close popup and cleanup
              if (popupWindow && !popupWindow.closed) {
                popupWindow.close();
              }
              clearInterval(checkClosedInterval);
              window.removeEventListener('message', messageHandler);
              
              onPaymentSuccess(paymentResult);
              onClose();
            } else if (event.data.type === 'PAYMENT_ERROR' || event.data.status === 'rejected' || event.data.status === 'failed') {
              console.log('[MercadoPago Modal] Payment error received:', event.data);
              setError(event.data.message || event.data.error || 'Payment failed. Please try again.');
              setIsProcessing(false);
            } else if (event.data.type === 'PAYMENT_PROCESSING') {
              console.log('[MercadoPago Modal] Payment processing...');
              setIsProcessing(true);
            }
          };
          
          window.addEventListener('message', messageHandler);

          // Store reference for cleanup
          brickRef.current = {
            window: popupWindow,
            messageHandler,
            unmount: () => {
              if (popupWindow && !popupWindow.closed) {
                popupWindow.close();
              }
              window.removeEventListener('message', messageHandler);
              if (checkClosedInterval) {
                clearInterval(checkClosedInterval);
              }
            }
          };

          // Check if popup was closed without payment
          const checkClosedInterval = setInterval(() => {
            if (popupWindow.closed) {
              console.log('[MercadoPago Modal] Popup window closed by user');
              clearInterval(checkClosedInterval);
              setError('Payment window was closed. Please try again.');
              setIsProcessing(false);
              window.removeEventListener('message', messageHandler);
            }
          }, 1000);

          setIsLoading(false);
        }, 100); // Small delay to ensure modal is rendered

      } catch (error) {
        console.error('Failed to open Flask brick window:', error);
        setError('Failed to open payment window. Please try again.');
        setIsLoading(false);
      }
    };

    openFlaskBrickWindow();

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