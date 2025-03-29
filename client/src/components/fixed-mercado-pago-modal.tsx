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

  // Initialize payment when SDK is loaded and we have hedge data
  useEffect(() => {
    if (!isOpen || !paymentEnabled || !mpScriptLoaded || !hedgeData) return;
    
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
        console.log('[MercadoPaymentModal] Preference data:', data);
        
        if (data.enabled === false) {
          setLoading(false);
          return;
        }
        
        if (!data.id || !data.public_key) {
          throw new Error('Invalid preference data returned from server');
        }

        // Initialize Mercado Pago with returned public key and preference
        // Use the user's browser language or default to English if available
        const userLanguage = navigator.language || 'en-US';
        const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
        
        // Determine if we should use Portuguese (default for Mercado Pago) or English
        const usePortuguese = currentLanguage.startsWith('pt') || currency === 'BRL';
        
        // Set the locale - this is the key change!
        // Mercado Pago only supports these locales: 'es-AR', 'es-CL', 'es-CO', 'es-MX', 'es-VE', 'es-UY', 'es-PE', 'pt-BR', 'en-US'
        const locale = usePortuguese ? 'pt-BR' : 'en-US';
        
        console.log(`[MercadoPaymentModal] Using locale: ${locale}`);
        
        // Initialize Mercado Pago with the chosen locale
        const mp = new window.MercadoPago(data.public_key, {
          locale: locale, // This is the critical setting for the SDK language
        });
        
        console.log('[MercadoPaymentModal] Mercado Pago instance created');
        
        const bricksBuilder = mp.bricks();
        console.log('[MercadoPaymentModal] Bricks builder created');
        
        // Wait for DOM to be fully ready (longer timeout)
        setTimeout(() => {
          console.log(`[MercadoPaymentModal] Looking for payment container with ID: ${paymentContainerId}`);
          
          // Try both the ref and getElementById approaches
          const containerElement = paymentContainerRef.current || document.getElementById(paymentContainerId);
          
          if (!containerElement) {
            console.error(`[MercadoPaymentModal] Payment container not found: #${paymentContainerId}`);
            setError('Payment interface could not be initialized - container not found');
            setLoading(false);
            return;
          }
          
          console.log('[MercadoPaymentModal] Container found, rendering payment brick');
          
          // Render the payment brick - use the container element directly if it's a ref
          bricksBuilder.create('payment', containerElement, {
            initialization: {
              amount: paymentAmount,
              preferenceId: data.id,
              payer: {
                email: 'customer@example.com',
              }
            },
            customization: {
              visual: {
                style: {
                  theme: 'default'
                },
                hideFormTitle: true
              },
              paymentMethods: {
                creditCard: 'all',
                bankTransfer: 'all',
                debit_card: 'excluded',
                ticket: 'all',
                // Remove ATM option
                atm: 'excluded',
                maxInstallments: 1
              },
              // With the Mercado Pago locale set correctly at SDK initialization, 
              // we only need minimal translations overrides for specific texts
              //
              // Since we're already setting the SDK locale, we can streamline the translations
              // and only provide custom overrides if needed
              labels: {
                cardNumber: {
                  label: usePortuguese ? 'Número do cartão' : 'Card number'
                },
                expirationDate: {
                  label: usePortuguese ? 'Data de vencimento' : 'Expiration date'
                }, 
                securityCode: {
                  label: usePortuguese ? 'Código de segurança' : 'Security code'
                },
                cardholderName: {
                  label: usePortuguese ? 'Nome do titular' : 'Cardholder name'
                }
              }
            },
            callbacks: {
              onReady: () => {
                console.log('[MercadoPaymentModal] Payment brick ready');
                setLoading(false);
              },
              onSubmit: (formData: any) => {
                console.log('[MercadoPaymentModal] Payment submitted:', formData);
                setLoading(true);
                
                return new Promise((resolve, reject) => {
                  fetch('/api/payment/process', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      preferenceId: data.id,
                      currency: currency,
                      formData: formData
                    }),
                  })
                  .then(response => response.json())
                  .then(result => {
                    console.log('[MercadoPaymentModal] Payment process result:', result);
                    
                    if (result.status === 'approved' || result.status === 'in_process') {
                      if (hedgeData) {
                        onSuccess(hedgeData);
                      }
                      // Get language preference for success messages
                      const userLanguage = navigator.language || 'en-US';
                      const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
                      const usePortuguese = currentLanguage.startsWith('pt');
                      
                      // Translated success message based on detected language
                      const successTitle = usePortuguese ? 'Pagamento bem-sucedido' : 'Payment successful';
                      const successDesc = usePortuguese
                        ? 'Seu pedido de hedge foi realizado com sucesso.'
                        : 'Your hedge order has been placed successfully.';
                        
                      toast({
                        title: successTitle,
                        description: successDesc,
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
                    console.error('[MercadoPaymentModal] Error processing payment:', error);
                    setError('Error processing payment. Please try again.');
                    setLoading(false);
                    reject(error);
                  });
                });
              },
              onError: (error: any) => {
                console.error('[MercadoPaymentModal] Payment brick error:', error);
                // Get language preference for error messages
                const userLanguage = navigator.language || 'en-US';
                const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
                const usePortuguese = currentLanguage.startsWith('pt');
                
                setError(usePortuguese 
                  ? 'Ocorreu um erro com o processador de pagamento. Por favor, tente novamente.' 
                  : 'An error occurred with the payment processor. Please try again.');
                setLoading(false);
              }
            }
          }).then((controller: any) => {
            window.paymentBrickController = controller;
          }).catch((error: any) => {
            console.error('[MercadoPaymentModal] Error creating payment brick:', error);
            setError(`Error creating payment interface: ${error instanceof Error ? error.message : String(error)}`);
            setLoading(false);
          });
        }, 1000); // Give the DOM more time to render
        
      } catch (error) {
        console.error('[MercadoPaymentModal] Error:', error);
        setError('Failed to initialize payment');
        setLoading(false);
      }
    };
    
    initializePayment();
  }, [isOpen, paymentEnabled, mpScriptLoaded, hedgeData, currency, simulation, onSuccess, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          {/* Localized dialog title */}
          {(() => {
            const userLanguage = navigator.language || 'en-US';
            const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
            const usePortuguese = currentLanguage.startsWith('pt');
            
            return (
              <DialogTitle>
                {usePortuguese ? 'Complete o pagamento para realizar o hedge' : 'Complete Payment to Place Hedge'}
              </DialogTitle>
            );
          })()}
        </DialogHeader>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            {/* Localized loading message */}
            {(() => {
              const userLanguage = navigator.language || 'en-US';
              const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
              const usePortuguese = currentLanguage.startsWith('pt');
              
              return <p>{usePortuguese ? 'Processando seu pagamento...' : 'Processing your payment...'}</p>;
            })()}
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            {/* Get language preference for UI text */}
            {(() => {
              const userLanguage = navigator.language || 'en-US';
              const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
              const usePortuguese = currentLanguage.startsWith('pt');
              
              return (
                <>
                  <p className="font-semibold">{usePortuguese ? 'Erro' : 'Error'}</p>
                  <p>{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-2" 
                    onClick={onClose}
                  >
                    {usePortuguese ? 'Fechar' : 'Close'}
                  </Button>
                </>
              );
            })()}
          </div>
        )}
        
        {!loading && !error && (
          <>
            {paymentEnabled ? (
              <>
                {/* Payment summary */}
                <div className="bg-muted p-3 rounded-md text-xs mb-3">
                  {/* Localized payment details */}
                  {(() => {
                    const userLanguage = navigator.language || 'en-US';
                    const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
                    const usePortuguese = currentLanguage.startsWith('pt');
                    
                    // Translations
                    const paymentDetails = usePortuguese ? 'Detalhes do Pagamento:' : 'Payment Details:';
                    const currencyLabel = usePortuguese ? 'Moeda' : 'Currency';
                    const hedgeAmountLabel = usePortuguese ? 'Valor do Hedge' : 'Hedge Amount';
                    const feesLabel = usePortuguese ? 'Taxas' : 'Fees';
                    const marginLabel = usePortuguese ? 'Margem' : 'Margin';
                    const totalPaymentLabel = usePortuguese ? 'Pagamento Total' : 'Total Payment';
                    
                    return (
                      <>
                        <p><strong>{paymentDetails}</strong></p>
                        <p>{currencyLabel}: {currency}</p>
                        {hedgeData && (
                          <>
                            <p>{hedgeAmountLabel}: {Math.abs(Number(hedgeData.amount)).toLocaleString()}</p>
                            
                            {/* Get the fees from the simulation result if available */}
                            {simulation ? (
                              <>
                                <p>{feesLabel}: {simulation.costDetails.hedgeCost.toFixed(2)} {currency}</p>
                                <p>{marginLabel}: {hedgeData.margin ? Number(hedgeData.margin).toFixed(2) : (simulation.costDetails.hedgeCost * 2).toFixed(2)} {currency}</p>
                                <p>{totalPaymentLabel}: {(simulation.costDetails.hedgeCost + (hedgeData.margin ? Number(hedgeData.margin) : simulation.costDetails.hedgeCost * 2)).toFixed(2)} {currency}</p>
                              </>
                            ) : (
                              <>
                                {/* Fallback for when simulation is not available */}
                                <p>{feesLabel}: {(Math.abs(Number(hedgeData.amount)) * 0.0025).toFixed(2)} {currency}</p>
                                <p>{marginLabel}: {hedgeData.margin ? Number(hedgeData.margin).toFixed(2) : (Math.abs(Number(hedgeData.amount)) * 0.0025 * 2).toFixed(2)} {currency}</p>
                                <p>{totalPaymentLabel}: {(Math.abs(Number(hedgeData.amount)) * 0.0025 + (hedgeData.margin ? Number(hedgeData.margin) : Math.abs(Number(hedgeData.amount)) * 0.0025 * 2)).toFixed(2)} {currency}</p>
                              </>
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                {/* Payment container - Mercado Pago will render the payment form here */}
                <div 
                  id={paymentContainerId}
                  ref={paymentContainerRef}
                  className="min-h-[300px] border border-gray-200 rounded-md p-4"
                >
                  <div className="flex flex-col items-center justify-center h-full py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-4" />
                    {/* Localized loading message */}
                    {(() => {
                      const userLanguage = navigator.language || 'en-US';
                      const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
                      const usePortuguese = currentLanguage.startsWith('pt');
                      
                      return (
                        <p className="text-sm text-muted-foreground">
                          {usePortuguese ? 'Carregando interface de pagamento...' : 'Loading payment interface...'}
                        </p>
                      );
                    })()}
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
                      // Get current user language
                      const userLanguage = navigator.language || 'en-US';
                      const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
                      
                      // Determine if we should use Portuguese
                      const usePortuguese = currentLanguage.startsWith('pt');
                      
                      toast({
                        title: usePortuguese ? 'Pagamento de teste processado' : 'Test payment processed',
                        description: usePortuguese 
                          ? 'Seu pedido de hedge foi realizado com sucesso.' 
                          : 'Your hedge order has been placed successfully.',
                        variant: 'default',
                      });
                      onClose();
                    }
                  }}
                >
                  {(() => {
                    const userLanguage = navigator.language || 'en-US';
                    const currentLanguage = localStorage.getItem('i18nextLng') || userLanguage;
                    const usePortuguese = currentLanguage.startsWith('pt');
                    
                    return usePortuguese 
                      ? 'Teste: Continuar sem pagamento' 
                      : 'Test: Continue without payment';
                  })()}
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