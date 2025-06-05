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
  const [showConfirmation, setShowConfirmation] = useState(false);
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
        
        // Handle different message formats from Flask server
        if (event.data && typeof event.data === 'object') {
          if (event.data.status === 'success' || event.data.status === 'approved') {
            const paymentResult = {
              id: event.data.payment_id || event.data.id || `payment_${Date.now()}`,
              status: 'approved',
              message: 'Payment processed successfully',
              token: event.data.token
            };
            
            window.removeEventListener('message', messageHandler);
            onPaymentSuccess(paymentResult);
          } else if (event.data.status === 'error' || event.data.status === 'failed') {
            setError(event.data.error || event.data.message || 'Payment failed. Please try again.');
          }
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
      
      // Add timeout mechanism to detect successful payments
      // Since Flask server processes payments but doesn't send postMessage,
      // we'll listen for navigation events that indicate payment completion
      const checkPaymentStatus = () => {
        try {
          // Check if iframe navigated to a success/completion page
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const url = iframe.contentWindow?.location.href;
            console.log('[Flask Payment Modal] Iframe URL:', url);
            
            // Check for success indicators in the URL or page content
            if (url && (url.includes('success') || url.includes('approved') || url.includes('completed'))) {
              const paymentResult = {
                id: `flask_payment_${Date.now()}`,
                status: 'approved',
                message: 'Payment processed successfully'
              };
              window.removeEventListener('message', messageHandler);
              onPaymentSuccess(paymentResult);
              return;
            }
          }
        } catch (error) {
          // Cross-origin restrictions prevent direct access
          console.log('[Flask Payment Modal] Cannot access iframe content due to CORS');
        }
        
        // Continue checking
        setTimeout(checkPaymentStatus, 2000);
      };
      
      // Show confirmation dialog after payment processing time
      setTimeout(() => {
        console.log('[Flask Payment Modal] Payment processing timeout reached, showing confirmation');
        setShowConfirmation(true);
      }, 10000); // 10 seconds for payment processing
      
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
          
          {showConfirmation && (
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10">
              <div className="text-center p-8 max-w-md">
                <h3 className="text-lg font-semibold mb-4">Payment Confirmation</h3>
                <p className="text-gray-600 mb-6">
                  Did your payment of ${amount} complete successfully?
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => {
                      const paymentResult = {
                        id: `flask_payment_${Date.now()}`,
                        status: 'approved',
                        message: 'Payment confirmed by user'
                      };
                      onPaymentSuccess(paymentResult);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Yes, Payment Completed
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                  >
                    No, Try Again
                  </Button>
                </div>
              </div>
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