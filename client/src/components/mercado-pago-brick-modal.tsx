import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { i18n, t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [isProcessingTrade, setIsProcessingTrade] = useState(false);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeCreated = useRef(false);
  const txIdRef = useRef<string>('');

  // Poll payment status instead of relying on postMessage
  const pollPaymentStatus = async (txId: string) => {
    console.log('[MercadoPago Brick Modal] Starting payment status polling for txId:', txId);
    setIsPollingPayment(true);
    
    const maxAttempts = 30; // Poll for 30 seconds
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      console.log(`[MercadoPago Brick Modal] Polling attempt ${attempts} for txId:`, txId);
      
      try {
        const response = await fetch(`/api/payment-status/${txId}`);
        const data = await response.json();
        
        if (data.status === 'approved' && data.id) {
          console.log('[MercadoPago Brick Modal] Payment approved via polling:', data);
          setPaymentResult({
            id: data.id,
            status: 'approved',
            message: data.message || 'Payment processed successfully',
            txId: data.txId
          });
          setIsLoading(false);
          setIsPollingPayment(false);
          
          // Automatically place trade with payment ID as token
          setIsProcessingTrade(true);
          await placeTrade(data.id, hedgeData);
          return;
        } else if (data.status === 'rejected') {
          console.log('[MercadoPago Brick Modal] Payment rejected via polling:', data);
          setPaymentResult({ 
            status: 'error', 
            error: 'Payment was rejected. Please try again with different payment details.' 
          });
          setIsLoading(false);
          setIsPollingPayment(false);
          return;
        } else if (data.status === 'error') {
          console.log('[MercadoPago Brick Modal] Payment failed via polling:', data);
          setPaymentResult({ 
            status: 'error', 
            error: data.error || 'Payment failed. Please try again.' 
          });
          setIsLoading(false);
          setIsPollingPayment(false);
          return;
        }
        
        // Continue polling if payment is still pending
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          console.log('[MercadoPago Brick Modal] Payment polling timeout');
          setPaymentResult({ 
            status: 'error', 
            error: 'Payment verification timeout. Please try again.' 
          });
          setIsLoading(false);
          setIsPollingPayment(false);
        }
      } catch (error) {
        console.error('[MercadoPago Brick Modal] Payment polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setPaymentResult({ 
            status: 'error', 
            error: 'Unable to verify payment. Please try again.' 
          });
          setIsLoading(false);
          setIsPollingPayment(false);
        }
      }
    };
    
    poll();
  };

  const placeTrade = async (paymentId: string, tradeData: any) => {
    try {
      console.log('[MercadoPago Brick Modal] Placing trade with payment ID as token:', paymentId);
      console.log('[MercadoPago Brick Modal] Original hedge data:', hedgeData);
      
      // Use the original hedge amount, not the payment amount
      const hedgeAmount = hedgeData?.amount ? parseFloat(hedgeData.amount) : 10000;
      
      const tradePayload = {
        amount: hedgeAmount, // Use hedge amount ($10,000), not payment amount ($415)
        volume: hedgeAmount / 100000, // Correct volume calculation based on hedge amount
        token: paymentId.toString(), // Use payment ID as token
        broker: tradeData?.broker || 'activetrades',
        type: 'hedge',
        symbol: tradeData?.symbol || 'USDBRL',
        direction: tradeData?.direction || 'buy'
      };
      
      console.log('[MercadoPago Brick Modal] Trade payload with correct amount:', tradePayload);

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
      // Auto-close after showing result for 20 seconds
      setTimeout(() => {
        window.removeEventListener('message', () => {});
        // Only call onPaymentSuccess if trade was successful
        if (paymentResult?.tradeSuccess) {
          onPaymentSuccess({
            id: paymentResult.id,
            status: 'approved',
            message: 'Payment and hedge placement completed successfully',
            trade: paymentResult.trade
          });
        }
      }, 20000);
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
      // Get current language locale - map 'pt-BR' to 'pt-BR' for Brazilian payment form
      const currentLang = i18n.language;
      const locale = currentLang === 'pt-BR' ? 'pt-BR' : 'en-US';
      iframe.src = `/api/proxy/brick?amount=${amount}&txId=${txIdRef.current}&lang=${locale}`;
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      console.log('[MercadoPago Brick Modal] Iframe URL:', iframe.src);
      console.log('[MercadoPago Brick Modal] Transaction ID:', txIdRef.current);
      
      const messageHandler = (event: MessageEvent) => {
        console.log('[MercadoPago Brick Modal] Received postMessage:', event.data);
        console.log('[MercadoPago Brick Modal] Event origin:', event.origin);
        console.log('[MercadoPago Brick Modal] Expected txId:', txIdRef.current);
        console.log('[MercadoPago Brick Modal] Received txId:', event.data?.txId);
        
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
        
        // Start polling for payment status after iframe loads
        setTimeout(() => {
          console.log('[MercadoPago Brick Modal] Starting payment status polling');
          pollPaymentStatus(txIdRef.current);
        }, 3000); // Wait 3 seconds for user to potentially start payment
      };
      
      iframe.onerror = () => {
        console.error('[MercadoPago Brick Modal] Iframe failed to load');
        setError('Failed to load payment form. Please try again.');
        setIsLoading(false);
      };
      
      // Add global listener for debugging
      const globalHandler = (event: MessageEvent) => {
        console.log('[Global] Any postMessage received:', event.data, 'from origin:', event.origin);
      };
      
      window.addEventListener('message', messageHandler);
      window.addEventListener('message', globalHandler);
      containerRef.current.appendChild(iframe);
      
      return () => {
        window.removeEventListener('message', globalHandler);
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
          <DialogTitle>
            {t('payment.title')} - {i18n.language === 'pt' ? 'R$' : '$'}{amount}
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