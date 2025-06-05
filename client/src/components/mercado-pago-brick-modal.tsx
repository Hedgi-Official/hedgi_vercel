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

    const loadFlaskBrick = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load payment form from Flask server brick endpoint
        if (containerRef.current) {
          // Create iframe to load Flask brick endpoint
          const iframe = document.createElement('iframe');
          iframe.src = `/api/flask-brick-proxy?amount=${amount}&hedgeData=${encodeURIComponent(JSON.stringify(hedgeData))}`;
          iframe.style.width = '100%';
          iframe.style.height = '500px';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '8px';
          
          // Listen for payment completion messages from iframe
          const messageHandler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'PAYMENT_SUCCESS') {
              onPaymentSuccess(event.data.paymentResult);
              onClose();
            } else if (event.data.type === 'PAYMENT_ERROR') {
              setError(event.data.error || 'Payment failed. Please try again.');
              setIsProcessing(false);
            } else if (event.data.type === 'PAYMENT_PROCESSING') {
              setIsProcessing(true);
            }
          };
          
          window.addEventListener('message', messageHandler);
          
          // Store cleanup function
          brickRef.current = {
            unmount: () => {
              window.removeEventListener('message', messageHandler);
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            }
          };
          
          containerRef.current.appendChild(iframe);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load Flask brick:', error);
        setError('Failed to load payment form. Please try again.');
        setIsLoading(false);
      }
    };

    loadFlaskBrick();

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