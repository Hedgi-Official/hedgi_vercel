import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';               // ← install uuid: npm install uuid
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
  // 1) Generate a unique txId once per‐modal
  const txIdRef = useRef<string>(uuidv4());

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // brickRef now also holds our messageHandler so we can unbind it
  const brickRef = useRef<{
    iframe: HTMLIFrameElement;
    messageHandler: (event: MessageEvent) => void;
    unmount: () => void;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isOpen || isInitialized.current) {
      return;
    }
    isInitialized.current = true;
    setIsLoading(true);
    setError(null);

    if (!containerRef.current) return;

    // 2) Append txId to the proxy URL
    const flaskUrl = `/api/proxy/brick?amount=${amount}&txId=${txIdRef.current}`;
    console.log('[MercadoPago Modal] Loading Flask brick in iframe:', flaskUrl);

    const iframe = document.createElement('iframe');
    iframe.src = flaskUrl;
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.background = '#ffffff';

    iframe.onload = () => {
      console.log('[MercadoPago Modal] Iframe loaded successfully');
      setIsLoading(false);
    };
    iframe.onerror = (err) => {
      console.error('[MercadoPago Modal] Iframe load error:', err);
      setError('Failed to load payment form. Please try again.');
      setIsLoading(false);
    };

    // 3) Filter incoming messages by txId
    const messageHandler = (event: MessageEvent) => {
      console.log('[MercadoPago Modal] Received message:', event);

      // Only trust local dev origins; in production check exact domain
      if (!event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) {
        console.log('[MercadoPago Modal] Ignoring message from origin:', event.origin);
        return;
      }

      const payload = event.data;
      if (!payload || typeof payload !== 'object') {
        return;
      }

      // Ignore any messages not meant for this txId
      if (payload.txId !== txIdRef.current) {
        console.log('[MercadoPago Modal] Ignoring message for wrong txId:', payload.txId);
        return;
      }

      // Now handle approved or error for the matching txId
      if (payload.status === 'approved') {
        console.log('[MercadoPago Modal] Payment approved for txId:', payload.txId, 'data:', payload.data);
        // Pass the full JSON (including refund token/id) up to React
        onPaymentSuccess(payload.data);
        window.removeEventListener('message', messageHandler);
        onClose();
      } else if (payload.status === 'error') {
        console.log('[MercadoPago Modal] Payment error for txId:', payload.txId, 'error:', payload.error);
        setError(payload.error || 'Payment failed. Please try again.');
        setIsProcessing(false);
      }
    };

    window.addEventListener('message', messageHandler);

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

    containerRef.current.appendChild(iframe);

    // Cleanup on modal close or unmount
    return () => {
      if (brickRef.current) {
        brickRef.current.unmount();
        brickRef.current = null;
      }
      isInitialized.current = false;
    };
  }, [isOpen, amount, onPaymentSuccess, onClose]);

  const handleClose = () => {
    if (brickRef.current) {
      brickRef.current.unmount();
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

          {/* Container for Flask‐served Brick iframe */}
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
