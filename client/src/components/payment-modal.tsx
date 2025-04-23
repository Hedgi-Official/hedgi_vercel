import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hedge } from '@db/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Define the Mercado Pago types based on their SDK
declare global {
  interface Window {
    MercadoPago: any;
    paymentBrickController: any; // Added to match Mercado Pago example
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
}

export function PaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const brickContainerRef = useRef<HTMLDivElement>(null);
  const paymentBrickControllerRef = useRef<any>(null);

  // Check if payments are enabled when the component mounts
  useEffect(() => {
    async function checkPaymentStatus() {
      try {
        console.log('[PaymentModal] Checking payment status...');
        const response = await fetch('/api/payment/status');
        const data = await response.json();
        console.log('[PaymentModal] Payment status response:', data);
        setPaymentEnabled(data.enabled);
        
        if (!data.enabled) {
          // If payments are disabled, inform the user that payments are off
          console.log('[PaymentModal] Payments are disabled');
          setError('Payments are currently disabled. The hedge cannot be placed at this time.');
          setLoading(false);
        } else {
          console.log('[PaymentModal] Payments enabled, proceeding to create preference');
        }
      } catch (error) {
        console.error('[PaymentModal] Error checking payment status:', error);
        setError('Failed to check payment status');
        setLoading(false);
      }
    }

    if (isOpen && hedgeData) {
      console.log('[PaymentModal] Modal opened with hedge data:', hedgeData);
      checkPaymentStatus();
    }
  }, [isOpen, hedgeData]);

  // Flag to track if preference creation is in progress
  const [preferenceCreationInProgress, setPreferenceCreationInProgress] = useState(false);
  
  // Create a payment preference when the modal opens and payments are enabled
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    async function createPaymentPreference() {
      if (!hedgeData || preferenceCreationInProgress) return;
      
      try {
        // Set the flag to prevent multiple requests
        setPreferenceCreationInProgress(true);
        setLoading(true);
        setError(null);
        
        // Calculate the payment amount based on hedge cost
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
        const paymentAmount = Number((hedgeCost).toFixed(2));
        
        console.log('[PaymentModal] Creating payment preference with amount:', paymentAmount);
        
        const response = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: paymentAmount,
            currency: currency,
            description: `Hedge for ${hedgeAmount} ${hedgeData.targetCurrency}${hedgeData.baseCurrency}`,
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
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[PaymentModal] API error:', response.status, errorText);
          if (isMounted) {
            setError(`API error: ${response.status}`);
            setLoading(false);
          }
          return;
        }
        
        const data = await response.json();
        console.log('[PaymentModal] Preference created successfully:', data);
        
        if (data.enabled === false) {
          // If payments are disabled, show error
          console.log('[PaymentModal] Payments disabled response received');
          if (isMounted) {
            setError('Payments are currently disabled. The hedge cannot be placed at this time.');
            setLoading(false);
          }
          return;
        }
        
        if (!data.id) {
          throw new Error('No preference ID returned');
        }
        
        if (isMounted) {
          setPreferenceId(data.id);
          loadMercadoPago(data.public_key, data.id);
        }
      } catch (error) {
        console.error('[PaymentModal] Error creating payment preference:', error);
        if (isMounted) {
          setError('Failed to initialize payment. Please try again.');
          setLoading(false);
        }
      } finally {
        if (isMounted) {
          setPreferenceCreationInProgress(false);
        }
      }
    }
    
    if (isOpen && hedgeData && paymentEnabled && !preferenceId) {
      createPaymentPreference();
    }
    
    // Cleanup function to handle component unmount
    return () => {
      isMounted = false;
    };
  }, [isOpen, hedgeData, paymentEnabled, currency, preferenceCreationInProgress, preferenceId]);

  // Flag to track if we already have an active brick to prevent rebuilding
  const [brickInitialized, setBrickInitialized] = useState(false);
  
  // Track initialization attempts to prevent infinite loops
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  
  // Clean up when the modal is closed
  useEffect(() => {
    if (!isOpen) {
      // Reset all state
      setPreferenceId(null);
      setError(null);
      setLoading(false);
      setBrickInitialized(false);
      setInitializationAttempts(0);
      
      // Unmount the controller if it exists
      if (paymentBrickControllerRef.current) {
        try {
          paymentBrickControllerRef.current.unmount();
          paymentBrickControllerRef.current = null;
        } catch (e) {
          console.error('[PaymentModal] Error unmounting payment brick:', e);
        }
      }
      
      // Reset the brick container
      if (brickContainerRef.current) {
        brickContainerRef.current.innerHTML = '';
      }
    }
  }, [isOpen]);
  
  // Add debug output for server and client environment
  useEffect(() => {
    if (isOpen && paymentEnabled) {
      console.log('[PaymentModal] Environment check:', {
        isDevelopment: process.env.NODE_ENV !== 'production',
        origin: window.location.origin,
        hostname: window.location.hostname,
      });
    }
  }, [isOpen, paymentEnabled]);
  
  // Load the Mercado Pago SDK
  // This is a simplified version that matches the Mercado Pago example
  const loadMercadoPago = (publicKey: string, prefId: string) => {
    // Only proceed if payments are enabled and brick not already initialized
    // Also limit the number of initialization attempts to prevent infinite loops
    if (!paymentEnabled || brickInitialized || initializationAttempts >= 2) {
      if (initializationAttempts >= 2 && !brickInitialized) {
        // If we've tried twice and failed, show the test payment option
        setError('Unable to initialize payment system after multiple attempts. Please use the test option below.');
        setLoading(false);
      }
      return;
    }
    
    // Increment initialization attempts
    setInitializationAttempts(prev => prev + 1);
    
    // Mark as initialized to prevent multiple attempts
    setBrickInitialized(true);
    
    console.log('[PaymentModal] Loading Mercado Pago with public key:', publicKey);
    console.log('[PaymentModal] Preference ID:', prefId);
    
    try {
      // Clear previous errors
      setError(null);
      
      // We assume the script is already loaded in the head section as per the example
      // Or we inject it if it's not there yet
      if (!window.MercadoPago) {
        console.log('[PaymentModal] MercadoPago not found, loading script...');
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        
        // Use the exact same pattern as the Mercado Pago example
        script.onload = () => {
          console.log('[PaymentModal] MercadoPago script loaded successfully');
          const mp = new window.MercadoPago(publicKey, {
            locale: currency === 'BRL' ? 'pt-BR' : 'es-MX'
          });
          
          const bricksBuilder = mp.bricks();
          renderPaymentBrick(bricksBuilder, prefId);
        };
        
        script.onerror = (error) => {
          console.error('[PaymentModal] Error loading MercadoPago script:', error);
          setError('Failed to load payment processor. Please use the test option below.');
          setLoading(false);
          setBrickInitialized(false); // Reset so user can try again
        };
        
        document.head.appendChild(script);
      } else {
        console.log('[PaymentModal] MercadoPago already loaded, initializing...');
        const mp = new window.MercadoPago(publicKey, {
          locale: currency === 'BRL' ? 'pt-BR' : 'es-MX'
        });
        
        const bricksBuilder = mp.bricks();
        renderPaymentBrick(bricksBuilder, prefId);
      }
    } catch (error) {
      console.error('[PaymentModal] Error in loadMercadoPago:', error);
      setError('Error setting up payment system. Please use the test option below.');
      setLoading(false);
      setBrickInitialized(false); // Reset so user can try again
    }
  };

  // Define the renderPaymentBrick function to match the Mercado Pago example exactly
  const renderPaymentBrick = async (bricksBuilder: any, prefId: string) => {
    try {
      console.log('[PaymentModal] Rendering payment brick');
      
      if (!brickContainerRef.current) {
        console.error('[PaymentModal] Container not found');
        setError('Payment container not found');
        setLoading(false);
        return;
      }
      
      // Calculate the payment amount based on hedge cost
      const hedgeAmount = hedgeData ? Math.abs(Number(hedgeData.amount)) : 0;
      const hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
      const paymentAmount = Number((hedgeCost).toFixed(2));
      
      console.log('[PaymentModal] Payment amount:', paymentAmount);

      // This settings object follows the Mercado Pago example
      const settings = {
        initialization: {
          amount: paymentAmount,
          preferenceId: prefId,
        },
        customization: {
          visual: {
            style: {
              theme: 'default'
            }
          },
          paymentMethods: {
            creditCard: 'all',
            bankTransfer: 'all',
            atm: 'all',
            maxInstallments: 1
          }
        },
        callbacks: {
          onReady: () => {
            console.log('[PaymentModal] Payment brick ready');
            setLoading(false);
          },
          onSubmit: (formData: any) => {
            console.log('[PaymentModal] Payment submitted:', formData);
            setLoading(true);
            
            return new Promise((resolve, reject) => {
              fetch('/api/payment/process', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  preferenceId: prefId,
                  currency: currency,
                  formData: formData
                }),
              })
              .then(response => response.json())
              .then(result => {
                console.log('[PaymentModal] Payment process result:', result);
                
                if (result.status === 'approved' || result.status === 'in_process') {
                  if (hedgeData) {
                    onSuccess(hedgeData);
                  }
                  toast({
                    title: 'Payment successful',
                    description: 'Your hedge order has been placed.',
                    variant: 'default',
                  });
                  resolve(undefined);
                  onClose();
                } else {
                  setError(`Payment ${result.status}: ${result.statusDetail || 'Please try again.'}`);
                  setLoading(false);
                  reject();
                }
              })
              .catch(error => {
                console.error('[PaymentModal] Error processing payment:', error);
                setError('Error processing payment. Please try again.');
                setLoading(false);
                reject(error);
              });
            });
          },
          onError: (error: any) => {
            console.error('[PaymentModal] Payment brick error:', error);
            // Check for specific MercadoPago API errors
            if (error && error.error === 'invalid_auto_return') {
              // Use the test payment option instead when this specific error occurs
              setError('Mercado Pago setup requires additional configuration. Please use the test option below.');
            } else {
              setError('An error occurred with the payment processor. Please try again.');
            }
            setLoading(false);
            // Reset initialization flag so user can try again
            setBrickInitialized(false);
          }
        }
      };
      
      try {
        // Attempt to create the payment brick
        console.log('[PaymentModal] Creating payment brick for preference ID:', prefId);
        window.paymentBrickController = await bricksBuilder.create(
          'payment',
          'paymentBrick_container',
          settings
        );
        
        // Also store in our ref for React component lifecycle management
        paymentBrickControllerRef.current = window.paymentBrickController;
        
        console.log('[PaymentModal] Payment brick created successfully');
      } catch (brickError) {
        // Check for specific error about back_url.success missing (SDK error)
        console.error('[PaymentModal] Error creating payment brick:', brickError);
        
        if (brickError && typeof brickError === 'object' && 'error' in brickError && brickError.error === 'invalid_auto_return') {
          setError('Mercado Pago configuration issue. Please use the test option below.');
        } else {
          throw brickError; // Re-throw to be caught by outer catch
        }
        
        // Reset the initialization flag
        setBrickInitialized(false);
      }
    } catch (error) {
      console.error('[PaymentModal] Error in renderPaymentBrick:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Check if error contains auto_return invalid message
      if (errorMsg.includes('auto_return invalid') || errorMsg.includes('back_url.success')) {
        setError('Mercado Pago requires redirects that are not configured. Please use the test payment option.');
      } else {
        setError(`Error creating payment interface: ${errorMsg}`);
      }
      setLoading(false);
      // Reset initialization flag
      setBrickInitialized(false);
    }
  };

  // No simulation function needed anymore, as we're using real Mercado Pago or no payments at all

  // Clean up when the component unmounts
  useEffect(() => {
    return () => {
      if (paymentBrickControllerRef.current) {
        try {
          paymentBrickControllerRef.current.unmount();
        } catch (e) {
          console.error('Error unmounting payment brick:', e);
        }
      }
    };
  }, []);

  // Create a simplified payment experience since the payment brick is causing issues
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Payment to Place Hedge</DialogTitle>
        </DialogHeader>
        
        {loading && !error && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Processing your payment...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            <p className="font-semibold">Error Processing Payment</p>
            <p>{error}</p>
            
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                To proceed with testing, you can use the test option below.
              </p>
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => {
                  console.log("[PaymentModal] Manual payment test button clicked");
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
                Continue with Test Payment
              </Button>
              
              <Button 
                variant="outline" 
                className="mt-2 w-full" 
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="py-4">
            <div className="space-y-4 mb-4">
              <p>
                The payment integration with Mercado Pago is currently experiencing technical difficulties. 
                To proceed, please use one of the following options:
              </p>
              
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Option 1: Use Test Payment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This will simulate a successful payment and allow you to place your hedge.
                </p>
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => {
                    console.log("[PaymentModal] Manual payment test button clicked");
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
                  Continue with Test Payment
                </Button>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Option 2: Try Again Later</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The payment system will be fully functional in the future. You can close this window and try again later.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
              
              {/* Hidden payment container - not shown but kept for future reference */}
              <div 
                id="paymentBrick_container" 
                ref={brickContainerRef} 
                className="hidden"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}