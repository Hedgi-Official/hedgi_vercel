import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [isProcessingTrade, setIsProcessingTrade] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeCreated = useRef(false);
  const txIdRef = useRef<string>('');

  const placeTrade = async (paymentId: string, tradeData: any) => {
    try {
      console.log('[MercadoPago Brick Modal] Placing trade with payment ID:', paymentId);
      
      const tradePayload = {
        amount: parseFloat(amount),
        token: paymentId,
        broker: tradeData.broker || 'mercadopago',
        type: 'hedge',
        symbol: tradeData.symbol || 'USDBRL',
        direction: tradeData.direction || 'buy'
      };

      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });

      if (response.ok) {
        const tradeResult = await response.json();
        console.log('[MercadoPago Brick Modal] Trade placed successfully:', tradeResult);
        setPaymentResult((prev: any) => ({ ...prev, trade: tradeResult }));
      } else {
        console.error('[MercadoPago Brick Modal] Trade placement failed');
        setPaymentResult((prev: any) => ({ ...prev, tradeError: 'Failed to place hedge trade' }));
      }
    } catch (error) {
      console.error('[MercadoPago Brick Modal] Error placing trade:', error);
      setPaymentResult((prev: any) => ({ ...prev, tradeError: 'Network error placing trade' }));
    } finally {
      setIsProcessingTrade(false);
      window.removeEventListener('message', () => {});
      setTimeout(() => onPaymentSuccess(paymentResult), 2000);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      iframeCreated.current = false;
      setIsLoading(true);
      setError(null);
      txIdRef.current = '';
      return;
    }

    if (iframeCreated.current || !containerRef.current) {
      return;
    }

    console.log('[MercadoPago Brick Modal] Creating iframe for amount:', amount);
    
    // Generate unique transaction ID
    txIdRef.current = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mark as created to prevent duplicates
    iframeCreated.current = true;
    
    try {
      // Clear container
      containerRef.current.innerHTML = '';
      
      // Create iframe with txId parameter
      const iframe = document.createElement('iframe');
      iframe.src = `/api/proxy/brick?amount=${amount}&txId=${txIdRef.current}`;
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      console.log('[MercadoPago Brick Modal] Iframe URL:', iframe.src);
      console.log('[MercadoPago Brick Modal] Transaction ID:', txIdRef.current);
      
      // Set up message handler for payment completion
      const messageHandler = (event: MessageEvent) => {
        console.log('[MercadoPago Brick Modal] Received postMessage:', event.data);
        
        // Validate this message is for our transaction
        if (event.data && event.data.txId === txIdRef.current) {
          console.log('[MercadoPago Brick Modal] Message matches our txId:', txIdRef.current);
          
          if (event.data.status === 'approved') {
            console.log('[MercadoPago Brick Modal] Payment approved:', event.data.data);
            
            const paymentResult = {
              id: event.data.data?.id || `payment_${Date.now()}`,
              status: 'approved',
              message: event.data.data?.message || 'Payment processed successfully',
              txId: event.data.txId
            };
            
            setPaymentResult(paymentResult);
            setIsLoading(false);
            
            // Automatically place trade with payment ID
            if (hedgeData && paymentResult.id) {
              setIsProcessingTrade(true);
              placeTrade(paymentResult.id, hedgeData);
            } else {
              window.removeEventListener('message', messageHandler);
              onPaymentSuccess(paymentResult);
            }
            
          } else if (event.data.status === 'error') {
            console.log('[MercadoPago Brick Modal] Payment error:', event.data.error);
            setPaymentResult({ status: 'error', error: event.data.error });
            setIsLoading(false);
          }
        } else if (event.data && event.data.txId) {
          console.log('[MercadoPago Brick Modal] Ignoring message for different txId:', event.data.txId);
        }
      };
      
      // Listen for iframe load
      iframe.onload = () => {
        console.log('[MercadoPago Brick Modal] Iframe loaded successfully');
        setIsLoading(false);
      };
      
      iframe.onerror = () => {
        console.error('[MercadoPago Brick Modal] Iframe failed to load');
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
      console.error('[MercadoPago Brick Modal] Error creating iframe:', error);
      setError('Failed to initialize payment form.');
      setIsLoading(false);
    }
  }, [isOpen, amount, onPaymentSuccess]);

  const handleRetry = () => {
    setPaymentResult(null);
    setError(null);
    setIsLoading(true);
    setIsProcessingTrade(false);
    iframeCreated.current = false;
    // The useEffect will recreate the iframe
  };

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
          {isLoading && !paymentResult && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading payment form...</span>
            </div>
          )}

          {isProcessingTrade && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Processing payment and placing hedge trade...</span>
            </div>
          )}

          {paymentResult && paymentResult.status === 'approved' && (
            <div className="text-center p-8">
              <div className="text-green-600 text-xl mb-4">✅ Payment Approved!</div>
              <p className="text-gray-600 mb-2">Payment ID: {paymentResult.id}</p>
              {paymentResult.trade && (
                <p className="text-green-600 mb-4">Hedge trade placed successfully!</p>
              )}
              {paymentResult.tradeError && (
                <p className="text-orange-600 mb-4">Payment successful, but trade placement failed: {paymentResult.tradeError}</p>
              )}
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {paymentResult && paymentResult.status === 'error' && (
            <div className="text-center p-8">
              <div className="text-red-600 text-xl mb-4">❌ Payment Failed</div>
              <p className="text-red-600 mb-4">{paymentResult.error}</p>
              <div className="space-x-2">
                <Button onClick={handleRetry}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {error && !paymentResult && (
            <div className="text-center p-8">
              <div className="text-red-600 mb-4">{error}</div>
              <Button onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}
          
          <div 
            ref={containerRef}
            className={isLoading || error || paymentResult || isProcessingTrade ? 'hidden' : 'block'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}