import { useState, useEffect, useRef } from 'react';
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
import { SimulationResult } from './enhanced-currency-simulator';

// Extend Window interface to include Mercado Pago typings
declare global {
  interface Window {
    MercadoPago: any;
    paymentBrickController: any;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
  simulation?: SimulationResult | null;
}

export function FixedMercadoPaymentModal({ isOpen, onClose, onSuccess, hedgeData, currency, simulation }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [mpScriptLoaded, setMpScriptLoaded] = useState(false);
  
  // Use a ref for the payment container element
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  
  // Define a unique ID for the payment container with a timestamp to ensure uniqueness
  const paymentContainerId = `mp_payment_container_${Date.now()}`;

  // Get user language
  const getUserLanguage = () => {
    const userLanguage = navigator.language || 'en-US';
    const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
    return currentLanguage;
  };

  // Check if Portuguese should be used - prioritize currency over browser language
  const shouldUsePortuguese = () => {
    // For BRL currency transactions, always use Portuguese
    if (currency === 'BRL') return true;
    // Fall back to browser language if currency doesn't dictate the language
    return getUserLanguage().startsWith('pt');
  };
  
  // Check if Spanish should be used - prioritize currency over browser language
  const shouldUseSpanish = () => {
    // For MXN currency transactions, always use Spanish
    if (currency === 'MXN') return true;
    // Fall back to browser language if currency doesn't dictate the language
    return getUserLanguage().startsWith('es');
  };
  
  // Get the locale based on currency
  const getLocaleForCurrency = () => {
    if (currency === 'BRL') return 'pt-BR';
    if (currency === 'MXN') return 'es-MX';
    return 'en-US';
  };

  // Check if payments are enabled when component mounts
  useEffect(() => {
    if (!isOpen) return;
    
    const checkPaymentStatus = async () => {
      try {
        console.log('[MercadoPaymentModal] Checking payment status...');
        const response = await fetch('/api/payment/status');
        const data = await response.json();
        console.log('[MercadoPaymentModal] Payment status:', data);
        setPaymentEnabled(data.enabled);
        
        if (!data.enabled) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[MercadoPaymentModal] Error checking payment status:', error);
        setError('Failed to check payment status');
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [isOpen]);

  // Load Mercado Pago SDK script
  useEffect(() => {
    if (!isOpen || !paymentEnabled) return;
    
    // Only load the script if it hasn't been loaded yet
    if (!window.MercadoPago && !mpScriptLoaded) {
      console.log('[MercadoPaymentModal] Loading Mercado Pago SDK...');
      
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      
      // Set the correct locale as a dataset attribute
      script.dataset.locale = getLocaleForCurrency();
      
      script.onload = () => {
        console.log('[MercadoPaymentModal] Mercado Pago SDK loaded successfully');
        setMpScriptLoaded(true);
      };
      
      script.onerror = (e) => {
        console.error('[MercadoPaymentModal] Error loading Mercado Pago SDK:', e);
        setError('Failed to load payment processor. Please try again later.');
        setLoading(false);
      };
      
      document.head.appendChild(script);
    } else if (window.MercadoPago && !mpScriptLoaded) {
      // SDK already loaded from somewhere else
      console.log('[MercadoPaymentModal] Mercado Pago SDK already loaded');
      setMpScriptLoaded(true);
    }
  }, [isOpen, paymentEnabled, mpScriptLoaded]);

  // Clean up any resources when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      // If the payment brick controller exists, unmount it
      if (window.paymentBrickController) {
        try {
          window.paymentBrickController.unmount();
        } catch (e) {
          console.error('[MercadoPaymentModal] Error unmounting payment brick:', e);
        }
      }
    };
  }, []);

  // Initialize payment and get checkout URL when modal opens
  useEffect(() => {
    if (!isOpen || !paymentEnabled || !hedgeData) return;
    
    // We don't need to wait for the MP SDK to load since we're using direct checkout URL
    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Calculate hedge cost based on amount
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        let hedgeCost;
        
        // Use simulation data if available for more accurate fee calculation
        if (simulation) {
          // The correct fee is in simulation.costDetails.hedgeCost, not simulation.totalCost
          hedgeCost = simulation.costDetails.hedgeCost;
          console.log('[MercadoPaymentModal] Using simulation hedgeCost:', hedgeCost);
        } else {
          // Fallback to the simple percentage calculation
          hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
          console.log('[MercadoPaymentModal] Using fallback hedgeCost calculation:', hedgeCost);
        }
        
        // Calculate margin amount (defaults to 2x hedgeCost if not provided)
        const marginAmount = hedgeData.margin ? Number(hedgeData.margin) : hedgeCost * 2;
        
        // Total payment is the sum of fees and margin
        const paymentAmount = Number((hedgeCost + marginAmount).toFixed(2));
        
        console.log(`[MercadoPaymentModal] Creating payment preference for ${paymentAmount} ${currency}`);
        
        // Determine the correct identification type based on currency
        const idType = currency === 'MXN' ? 'RFC' : 'CPF';
        // Sample identification numbers (these are just test values)
        const idNumber = currency === 'MXN' ? 'XAXX010101000' : '219585466';
        
        // Log currency-specific payment settings
        console.log(`[MercadoPaymentModal] Using ${currency}-specific settings:`, {
          locale: getLocaleForCurrency(),
          identificationType: idType,
          identificationNumber: idNumber
        });
        
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
                type: idType,
                number: idNumber
              }
            },
          }),
        });
        
        const data = await response.json();
        console.log('[MercadoPaymentModal] Preference data:', data);
        
        if (data.enabled === false) {
          setLoading(false);
          return;
        }
        
        if (!data.init_point) {
          throw new Error('Invalid preference data returned from server - missing checkout URL');
        }

        // Store the Direct Checkout URL in the ref for later use
        if (paymentContainerRef.current) {
          // Add a data attribute with the checkout URL to the container
          paymentContainerRef.current.dataset.checkoutUrl = data.init_point;
        }
        
        // Setup message event listener for payment completion
        const handleMessage = (event: MessageEvent) => {
          try {
            // Check if the message is from our payment callback page
            if (event.data && typeof event.data === 'object') {
              const messageData = event.data;
              
              if (messageData.type === 'PAYMENT_SUCCESS') {
                console.log('[MercadoPaymentModal] Received payment success message:', messageData);
                
                if (hedgeData) {
                  onSuccess(hedgeData);
                  
                  // Show success toast
                  const successTitle = t(
                    'Pagamento bem-sucedido', 
                    'Payment successful',
                    'Pago exitoso'
                  );
                  const successDesc = t(
                    'Seu pedido de hedge foi realizado com sucesso.',
                    'Your hedge order has been placed successfully.',
                    'Tu orden de cobertura ha sido colocada con éxito.'
                  );
                    
                  toast({
                    title: successTitle,
                    description: successDesc,
                    variant: 'default',
                  });
                  
                  // Close the modal
                  onClose();
                }
              } else if (messageData.type === 'PAYMENT_FAILED') {
                console.log('[MercadoPaymentModal] Received payment failure message:', messageData);
                // Localized error message
                const errorMessage = t(
                  'Falha no pagamento. Por favor, tente novamente.',
                  'Payment failed. Please try again.',
                  'Pago fallido. Por favor, inténtalo de nuevo.'
                );
                setError(errorMessage);
                setLoading(false);
              } else if (messageData.type === 'PAYMENT_PENDING') {
                console.log('[MercadoPaymentModal] Received payment pending message:', messageData);
                
                if (hedgeData) {
                  onSuccess(hedgeData);
                  
                  // Show pending toast
                  const pendingTitle = t(
                    'Pagamento pendente', 
                    'Payment pending',
                    'Pago pendiente'
                  );
                  const pendingDesc = t(
                    'Seu pagamento está sendo processado. O hedge será colocado quando confirmado.',
                    'Your payment is being processed. Your hedge will be placed when confirmed.',
                    'Tu pago está siendo procesado. La cobertura se colocará cuando se confirme.'
                  );
                    
                  toast({
                    title: pendingTitle,
                    description: pendingDesc,
                    variant: 'default',
                  });
                  
                  // Close the modal
                  onClose();
                }
              }
            }
          } catch (e) {
            console.error('[MercadoPaymentModal] Error handling message:', e);
          }
        };
        
        // Add event listener for cross-window messaging
        window.addEventListener('message', handleMessage);
        
        // Store the cleanup function
        const cleanup = () => {
          window.removeEventListener('message', handleMessage);
        };
        
        // Store the cleanup function in a ref for later use
        if (paymentContainerRef.current) {
          paymentContainerRef.current.dataset.cleanup = 'true';
        }
        
        setLoading(false);
        
        return cleanup;
      } catch (error) {
        console.error('[MercadoPaymentModal] Error:', error);
        setError('Failed to initialize payment');
        setLoading(false);
      }
    };
    
    initializePayment();
  }, [isOpen, paymentEnabled, hedgeData, currency, simulation, onSuccess, onClose]);

  // Translation helper function
  const t = (pt: string, en: string, es?: string) => {
    if (shouldUsePortuguese()) return pt;
    if (shouldUseSpanish() && es) return es;
    return en;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t(
              'Complete o pagamento para realizar o hedge', 
              'Complete Payment to Place Hedge',
              'Completa el pago para colocar la cobertura'
            )}
          </DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>{t('Processando seu pagamento...', 'Processing your payment...', 'Procesando tu pago...')}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            <p className="font-semibold">{t('Erro', 'Error', 'Error')}</p>
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={onClose}
            >
              {t('Fechar', 'Close', 'Cerrar')}
            </Button>
          </div>
        )}
        
        {!loading && !error && (
          <>
            {paymentEnabled ? (
              <>
                {/* Payment summary */}
                <div className="bg-muted p-3 rounded-md text-xs mb-3">
                  <p><strong>{t('Detalhes do Pagamento:', 'Payment Details:', 'Detalles del Pago:')}</strong></p>
                  <p>{t('Moeda', 'Currency', 'Moneda')}: {currency}</p>
                  {hedgeData && (
                    <>
                      <p>{t('Valor do Hedge', 'Hedge Amount', 'Monto de Cobertura')}: {Math.abs(Number(hedgeData.amount)).toLocaleString()}</p>
                      
                      {/* Get the fees from the simulation result if available */}
                      {simulation ? (
                        <>
                          <p>{t('Taxas', 'Fees', 'Comisiones')}: {simulation.costDetails.hedgeCost.toFixed(2)} {currency}</p>
                          <p>{t('Margem', 'Margin', 'Margen')}: {hedgeData.margin ? Number(hedgeData.margin).toFixed(2) : (simulation.costDetails.hedgeCost * 2).toFixed(2)} {currency}</p>
                          <p>{t('Pagamento Total', 'Total Payment', 'Pago Total')}: {(simulation.costDetails.hedgeCost + (hedgeData.margin ? Number(hedgeData.margin) : simulation.costDetails.hedgeCost * 2)).toFixed(2)} {currency}</p>
                        </>
                      ) : (
                        <>
                          {/* Fallback for when simulation is not available */}
                          <p>{t('Taxas', 'Fees', 'Comisiones')}: {(Math.abs(Number(hedgeData.amount)) * 0.0025).toFixed(2)} {currency}</p>
                          <p>{t('Margem', 'Margin', 'Margen')}: {hedgeData.margin ? Number(hedgeData.margin).toFixed(2) : (Math.abs(Number(hedgeData.amount)) * 0.0025 * 2).toFixed(2)} {currency}</p>
                          <p>{t('Pagamento Total', 'Total Payment', 'Pago Total')}: {(Math.abs(Number(hedgeData.amount)) * 0.0025 + (hedgeData.margin ? Number(hedgeData.margin) : Math.abs(Number(hedgeData.amount)) * 0.0025 * 2)).toFixed(2)} {currency}</p>
                        </>
                      )}
                    </>
                  )}
                </div>
                
                {/* Direct Link Payment Container */}
                <div 
                  id={paymentContainerId}
                  ref={paymentContainerRef}
                  className="rounded-md border p-5 z-10"
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium mb-4">
                      {t('Complete o seu pagamento', 'Complete Your Payment', 'Completa tu pago')}
                    </h3>
                    
                    <p className="text-muted-foreground mb-6">
                      {t(
                        'Clique no botão abaixo para abrir uma janela de pagamento segura. Após concluir o pagamento, seu hedge será colocado automaticamente.',
                        'Click the button below to open a secure payment window. After completing your payment, your hedge will be automatically placed.',
                        'Haz clic en el botón de abajo para abrir una ventana de pago segura. Después de completar tu pago, tu cobertura se colocará automáticamente.'
                      )}
                    </p>
                    
                    <Button 
                      variant="default"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        const checkoutUrl = paymentContainerRef.current?.dataset.checkoutUrl;
                        if (!checkoutUrl) {
                          console.error('[MercadoPaymentModal] No checkout URL found');
                          setError('Payment URL not found. Please try again.');
                          return;
                        }
                        
                        console.log('[MercadoPaymentModal] Opening payment window with URL:', checkoutUrl);
                        
                        // Open the checkout URL in a new window with specific dimensions
                        const width = 800;
                        const height = 700;
                        const left = window.screenX + (window.outerWidth - width) / 2;
                        const top = window.screenY + (window.outerHeight - height) / 2;
                        
                        // Add the locale to the checkout URL for proper language display
                        const localeParam = new URL(checkoutUrl);
                        // Set the locale based on currency
                        const locale = getLocaleForCurrency();
                        localeParam.searchParams.set('locale', locale);
                        console.log(`[MercadoPaymentModal] Setting locale to ${locale} for currency: ${currency}`);
                        
                        window.open(
                          localeParam.toString(),
                          'MercadoPagoPayment',
                          `width=${width},height=${height},left=${left},top=${top}`
                        );
                      }}
                    >
                      {t('Abrir Janela de Pagamento', 'Open Payment Window', 'Abrir Ventana de Pago')}
                    </Button>
                    
                    <div className="text-xs text-muted-foreground text-center">
                      {t(
                        'Você será redirecionado para a plataforma de pagamento segura do Mercado Pago',
                        'You\'ll be redirected to Mercado Pago\'s secure payment platform',
                        'Serás redirigido a la plataforma de pago segura de Mercado Pago'
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="mt-4 w-full" 
                  onClick={() => {
                    console.log("[MercadoPaymentModal] Manual payment test button clicked");
                    // This simulates a successful payment for testing
                    if (hedgeData) {
                      onSuccess(hedgeData);
                      
                      toast({
                        title: t(
                          'Pagamento de teste processado', 
                          'Test payment processed',
                          'Pago de prueba procesado'
                        ),
                        description: t(
                          'Seu pedido de hedge foi realizado com sucesso.', 
                          'Your hedge order has been placed successfully.',
                          'Tu orden de cobertura ha sido colocada con éxito.'
                        ),
                        variant: 'default',
                      });
                      onClose();
                    }
                  }}
                >
                  {t('Teste: Continuar sem pagamento', 'Test: Continue without payment', 'Prueba: Continuar sin pago')}
                </Button>
              </>
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