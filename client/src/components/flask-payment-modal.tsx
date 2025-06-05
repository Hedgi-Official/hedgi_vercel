import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";

interface FlaskPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentResult: any) => void;
  amount: string;
  hedgeData?: any;
}

export function FlaskPaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  amount,
  hedgeData
}: FlaskPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeCreated = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      iframeCreated.current = false;
      setIsLoading(true);
      setError(null);
      return;
    }

    if (iframeCreated.current || !containerRef.current) {
      return;
    }

    console.log('[Flask Payment Modal] Creating iframe for amount:', amount);
    
    // Mark as created to prevent duplicates
    iframeCreated.current = true;
    
    try {
      // Clear container
      containerRef.current.innerHTML = '';
      
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = `/api/proxy/brick?amount=${amount}`;
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      console.log('[Flask Payment Modal] Iframe URL:', iframe.src);
      
      // Set up message handler for payment completion
      const messageHandler = (event: MessageEvent) => {
        console.log('[Flask Payment Modal] Received message:', event.data);
        
        if (event.data.status === 'success') {
          const paymentResult = {
            id: event.data.data?.id || `payment_${Date.now()}`,
            status: 'approved',
            message: 'Payment processed successfully'
          };
          
          window.removeEventListener('message', messageHandler);
          onPaymentSuccess(paymentResult);
        } else if (event.data.status === 'error') {
          setError(event.data.error || 'Payment failed. Please try again.');
        }
      };
      
      // Listen for iframe load
      iframe.onload = () => {
        console.log('[Flask Payment Modal] Iframe loaded successfully');
        setIsLoading(false);
      };
      
      iframe.onerror = () => {
        console.error('[Flask Payment Modal] Iframe failed to load');
        setError('Failed to load payment form. Please try again.');
        setIsLoading(false);
      };
      
      // Add message listener
      window.addEventListener('message', messageHandler);
      
      // Add iframe to container
      containerRef.current.appendChild(iframe);
      
      // Cleanup function
      return () => {
        window.removeEventListener('message', messageHandler);
      };
      
    } catch (error) {
      console.error('[Flask Payment Modal] Error creating iframe:', error);
      setError('Failed to initialize payment form.');
      setIsLoading(false);
    }
  }, [isOpen, amount, onPaymentSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Payment - ${amount}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading payment form...</span>
            </div>
          )}
          
          {error && (
            <div className="text-center p-8">
              <div className="text-red-600 mb-4">{error}</div>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}
          
          <div 
            ref={containerRef}
            className={isLoading || error ? 'hidden' : 'block'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}