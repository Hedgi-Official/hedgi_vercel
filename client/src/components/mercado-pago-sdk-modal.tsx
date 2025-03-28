import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Hedge } from "db/schema";
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

export function MercadoPayoSDKModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  
  // Check if payments are enabled when component mounts
  useEffect(() => {
    if (!isOpen) return;
    
    const checkPaymentStatus = async () => {
      try {
        console.log('[MercadoPayoSDKModal] Checking payment status...');
        const response = await fetch('/api/payment/status');
        const data = await response.json();
        console.log('[MercadoPayoSDKModal] Payment status:', data);
        setPaymentEnabled(data.enabled);
        
        if (!data.enabled) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[MercadoPayoSDKModal] Error checking payment status:', error);
        setError('Failed to check payment status');
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [isOpen]);

  // Create payment preference when component mounts and payments are enabled
  useEffect(() => {
    if (!isOpen || !paymentEnabled || !hedgeData) return;
    
    const createPreference = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Calculate hedge cost based on amount
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
        const paymentAmount = Number((hedgeCost).toFixed(2));
        
        console.log(`[MercadoPayoSDKModal] Creating payment preference for ${paymentAmount} ${currency}`);
        
        // Create payment preference
        const response = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmount,
            currency: currency,
            description: `Hedge for ${hedgeAmount} ${hedgeData.targetCurrency}/${hedgeData.baseCurrency}`,
            payer: {
              email: 'customer@example.com',
              name: 'Test Customer',
              identification: {
                type: 'CPF',
                number: '219585466'
              }
            },
          }),
        });
        
        const data = await response.json();
        console.log('[MercadoPayoSDKModal] Preference data:', data);
        
        if (data.enabled === false) {
          setLoading(false);
          return;
        }
        
        if (!data.id || !data.public_key) {
          throw new Error('Invalid preference data returned from server');
        }
        
        setPreferenceId(data.id);
        setPublicKey(data.public_key);
        
        // Initialize MercadoPago with the public key
        initMercadoPago(data.public_key, { 
          locale: currency === 'BRL' ? 'pt-BR' : 'es-MX'
        });
        
        setLoading(false);
      } catch (error) {
        console.error('[MercadoPayoSDKModal] Error creating preference:', error);
        setError('Failed to initialize payment');
        setLoading(false);
      }
    };
    
    createPreference();
  }, [isOpen, paymentEnabled, hedgeData, currency]);
  
  // Calculate amount from hedge data for payment
  const paymentAmount = hedgeData ? 
    Math.abs(Number(hedgeData.amount)) * 0.0025 : // 0.25% cost
    0;
    
  // Handler functions
  const onReady = () => {
    console.log('[MercadoPayoSDKModal] Payment brick ready');
    setLoading(false); // Ensure loading is set to false when ready
  };
  
  const onError = (error: any) => {
    console.error('[MercadoPayoSDKModal] Payment error:', error);
    // Format the error message properly
    let errorMessage = 'An unexpected error occurred';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      // Try to extract meaningful information from the error object
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      } else {
        errorMessage = JSON.stringify(error);
      }
    }
    
    setError(`Payment error: ${errorMessage}`);
  };
  
  const onSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferenceId: preferenceId,
          currency: currency,
          formData: formData
        }),
      });
      
      const result = await response.json();
      console.log('[MercadoPayoSDKModal] Payment process result:', result);
      
      if (result.status === 'approved' || result.status === 'in_process') {
        if (hedgeData) {
          onSuccess(hedgeData);
        }
        toast({
          title: 'Payment successful',
          description: 'Your hedge order has been placed.',
          variant: 'default',
        });
        onClose();
      } else {
        setError(`Payment ${result.status}: ${result.statusDetail || 'Please try again.'}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('[MercadoPayoSDKModal] Error processing payment:', error);
      setError('Error processing payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Processing your payment...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
        
        {!loading && !error && (
          <>
            {paymentEnabled && preferenceId && publicKey ? (
              <div className="min-h-[300px]">
                {/* Showing debug information */}
                <div className="bg-muted p-3 rounded-md text-xs mb-3">
                  <p><strong>Debug Info:</strong></p>
                  <p>Public Key: {publicKey || 'Not available'}</p>
                  <p>Preference ID: {preferenceId || 'Not available'}</p>
                  <p>Payment Amount: {paymentAmount}</p>
                  <p>Currency: {currency}</p>
                </div>
                
                <Payment 
                  initialization={{
                    amount: paymentAmount,
                    preferenceId: preferenceId || '',
                  }}
                  customization={{
                    visual: {
                      hideFormTitle: true,
                    },
                    paymentMethods: {
                      creditCard: 'all',
                      debitCard: 'all',
                      bankTransfer: 'all',
                      // Only include necessary payment methods
                      mercadoPago: [],
                      atm: [],
                      ticket: [],
                      prepaidCard: []
                    }
                  }}
                  onReady={onReady}
                  onError={onError}
                  onSubmit={onSubmit}
                />
                <Button 
                  variant="outline" 
                  className="mt-4 w-full" 
                  onClick={() => {
                    console.log("[MercadoPayoSDKModal] Manual payment test button clicked");
                    // This simulates a successful payment for testing
                    if (hedgeData) {
                      onSuccess(hedgeData);
                      toast({
                        title: 'Test payment processed',
                        description: 'Your hedge order has been placed.',
                        variant: 'default',
                      });
                      onClose();
                    }
                  }}
                >
                  Test: Continue without payment
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="mb-4">Payment processing is disabled in this environment.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  In a production environment, you would complete payment before placing your hedge.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-2" 
                  onClick={() => {
                    if (hedgeData) {
                      onSuccess(hedgeData);
                      onClose();
                    }
                  }}
                >
                  Continue without payment
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}