import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MercadoPagoBrickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentResult: any) => void;
  amount: string;
  hedgeData?: any;
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
  const isInitialized = useRef(false);

  console.log('[MercadoPago Modal] Component rendered - isOpen:', isOpen, 'amount:', amount);

  useEffect(() => {
    console.log('[MercadoPago Modal] useEffect triggered - isOpen:', isOpen, 'amount:', amount, 'initialized:', isInitialized.current);
    
    if (!isOpen || isInitialized.current) {
      console.log('[MercadoPago Modal] Modal not open or already initialized, skipping brick load');
      return;
    }

    console.log('[MercadoPago Modal] Starting brick load process');
    isInitialized.current = true;

    const loadFlaskBrick = () => {
      try {
        setIsLoading(true);
        setError(null);

        if (containerRef.current) {
          const flaskUrl = `/api/proxy/brick?amount=${amount}`;
          
          console.log('[MercadoPago Modal] Loading Flask brick in iframe:', flaskUrl);
          
          // Create iframe element
          const iframe = document.createElement('iframe');
          iframe.src = flaskUrl;
          iframe.style.width = '100%';
          iframe.style.height = '500px';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '8px';
          iframe.style.background = '#ffffff';
          
          // Add iframe event listeners for debugging
          iframe.onload = () => {
            console.log('[MercadoPago Modal] Iframe loaded successfully');
            setIsLoading(false);
          };
          
          iframe.onerror = (error) => {
            console.error('[MercadoPago Modal] Iframe load error:', error);
            setError('Failed to load payment form. Please try again.');
            setIsLoading(false);
          };
          
          // Listen for payment completion messages from iframe
          const messageHandler = (event: MessageEvent) => {
            console.log('[MercadoPago Modal] Received message:', event);
            
            // Accept messages from our local brick iframe
            if (!event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) {
              console.log('[MercadoPago Modal] Ignoring message from origin:', event.origin);
              return;
            }
            
            // Handle Flask brick postMessage format: { status: 'success', data: response } or { status: 'error', error: ... }
            if (event.data.status === 'success') {
              console.log('[MercadoPago Modal] Payment success received:', event.data);
              
              // Extract payment data from Flask brick response
              const paymentResult = {
                id: event.data.data?.id || `mp_${Date.now()}`,
                status: 'approved',
                message: 'Payment processed successfully'
              };
              
              // Cleanup and notify success
              window.removeEventListener('message', messageHandler);
              onPaymentSuccess(paymentResult);
              onClose();
            } else if (event.data.status === 'error') {
              console.log('[MercadoPago Modal] Payment error received:', event.data);
              setError(event.data.error || 'Payment failed. Please try again.');
              setIsProcessing(false);
            }
          };
          
          window.addEventListener('message', messageHandler);

          // Store reference for cleanup
          brickRef.current = {
            iframe,
            messageHandler,
            unmount: () => {
              window.removeEventListener('message', messageHandler);
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            }
          };

          // Add iframe to container
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
      isInitialized.current = false;
    };
  }, [isOpen, amount]);

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
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading payment form...</span>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Processing payment...</span>
            </div>
          )}

          {/* Container for Flask brick iframe */}
          <div 
            ref={containerRef}
            className="w-full min-h-[500px] bg-white rounded-lg"
            style={{ display: isLoading ? 'none' : 'block' }}
          />

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}