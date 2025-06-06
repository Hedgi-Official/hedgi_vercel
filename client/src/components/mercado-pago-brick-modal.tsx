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
      console.log('[MercadoPago Brick Modal] Placing trade with payment ID as token:', paymentId);
      
      const tradePayload = {
        amount: parseFloat(amount),
        token: paymentId.toString(), // Use payment ID as token
        broker: tradeData?.broker || 'activetrades',
        type: 'hedge',
        symbol: tradeData?.symbol || 'USDBRL',
        direction: tradeData?.direction || 'buy'
      };

      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });

      if (response.ok) {
        const tradeResult = await response.json();
        console.log('[MercadoPago Brick Modal] Trade placed successfully:', tradeResult);
        setPaymentResult((prev: any) => ({ ...prev, trade: tradeResult, tradeSuccess: true }));
      } else {
        const errorText = await response.text();
        console.error('[MercadoPago Brick Modal] Trade placement failed:', errorText);
        setPaymentResult((prev: any) => ({ ...prev, tradeError: 'Failed to place hedge trade' }));
      }
    } catch (error) {
      console.error('[MercadoPago Brick Modal] Error placing trade:', error);
      setPaymentResult((prev: any) => ({ ...prev, tradeError: 'Network error placing trade' }));
    } finally {
      setIsProcessingTrade(false);
      // Auto-close after showing result for 3 seconds
      setTimeout(() => {
        window.removeEventListener('message', () => {});
        onPaymentSuccess(paymentResult);
      }, 3000);
    }
  };

  const handleRetry = () => {
    setPaymentResult(null);
    setError(null);
    setIsLoading(true);
    setIsProcessingTrade(false);
    iframeCreated.current = false;
  };

  useEffect(() => {
    if (!isOpen) {
      iframeCreated.current = false;
      setIsLoading(true);
      setError(null);
      setPaymentResult(null);
      setIsProcessingTrade(false);
      txIdRef.current = '';
      return;
    }

    if (iframeCreated.current || !containerRef.current) {
      return;
    }

    console.log('[MercadoPago Brick Modal] Creating iframe for amount:', amount);
    
    txIdRef.current = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    iframeCreated.current = true;
    
    try {
      containerRef.current.innerHTML = '';
      
      const iframe = document.createElement('iframe');
      iframe.src = `/api/proxy/brick?amount=${amount}&txId=${txIdRef.current}`;
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      console.log('[MercadoPago Brick Modal] Iframe URL:', iframe.src);
      console.log('[MercadoPago Brick Modal] Transaction ID:', txIdRef.current);
      
      const messageHandler = (event: MessageEvent) => {
        console.log('[MercadoPago Brick Modal] Received postMessage:', event.data);
        
        if (event.data && event.data.txId === txIdRef.current) {
          console.log('[MercadoPago Brick Modal] Message matches our txId:', txIdRef.current);
          
          if (event.data.status === 'approved') {
            console.log('[MercadoPago Brick Modal] Payment approved:', event.data.data);
            
            const paymentData = event.data.data || {};
            const paymentResult = {
              id: paymentData.id,
              status: 'approved',
              message: paymentData.message || 'Payment processed successfully',
              txId: event.data.txId
            };
            
            setPaymentResult(paymentResult);
            setIsLoading(false);
            
            // Automatically place trade with payment ID as token
            if (paymentResult.id) {
              setIsProcessingTrade(true);
              placeTrade(paymentResult.id, hedgeData);
            } else {
              window.removeEventListener('message', messageHandler);
              onPaymentSuccess(paymentResult);
            }
            
          } else if (event.data.status === 'error' || event.data.status === '400') {
            console.log('[MercadoPago Brick Modal] Payment failed:', event.data.error);
            setPaymentResult({ 
              status: 'error', 
              error: event.data.error || 'Payment failed. Please try again.' 
            });
            setIsLoading(false);
          }
        } else if (event.data && event.data.txId) {
          console.log('[MercadoPago Brick Modal] Ignoring message for different txId:', event.data.txId);
        }
      };
      
      iframe.onload = () => {
        console.log('[MercadoPago Brick Modal] Iframe loaded successfully');
        setIsLoading(false);
      };
      
      iframe.onerror = () => {
        console.error('[MercadoPago Brick Modal] Iframe failed to load');
        setError('Failed to load payment form. Please try again.');
        setIsLoading(false);
      };
      
      window.addEventListener('message', messageHandler);
      containerRef.current.appendChild(iframe);
      
      return () => {
        window.removeEventListener('message', messageHandler);
      };
      
    } catch (error) {
      console.error('[MercadoPago Brick Modal] Error creating iframe:', error);
      setError('Failed to initialize payment form.');
      setIsLoading(false);
    }
  }, [isOpen, amount, onPaymentSuccess, hedgeData]);

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
            <div className="text-center p-8 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-700 text-2xl mb-3">✅ Payment Approved!</div>
              <div className="bg-white p-4 rounded border mb-4">
                <p className="text-sm text-gray-600 mb-1">Payment ID: {paymentResult.id}</p>
                <p className="text-sm text-gray-600">{paymentResult.message}</p>
              </div>
              {paymentResult.tradeSuccess && (
                <div className="bg-green-100 p-3 rounded mb-4">
                  <p className="text-green-700 font-semibold">🎯 Hedge trade placed successfully!</p>
                </div>
              )}
              {paymentResult.tradeError && (
                <div className="bg-orange-100 p-3 rounded mb-4">
                  <p className="text-orange-700">⚠️ Payment successful, but trade placement failed</p>
                  <p className="text-sm text-orange-600">{paymentResult.tradeError}</p>
                </div>
              )}
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                Close
              </Button>
            </div>
          )}

          {paymentResult && paymentResult.status === 'error' && (
            <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-700 text-2xl mb-3">❌ Payment Failed</div>
              <div className="bg-white p-4 rounded border mb-4">
                <p className="text-red-600">{paymentResult.error}</p>
              </div>
              <div className="space-x-2">
                <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700">
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