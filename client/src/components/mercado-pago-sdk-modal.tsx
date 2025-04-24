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
import { useTranslation } from 'react-i18next';

// Import the SimulationResult interface
import { SimulationResult } from "./currency-simulator";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
  simulation?: SimulationResult | null;
}

export function MercadoPayoSDKModal({ isOpen, onClose, onSuccess, hedgeData, currency, simulation }: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const { i18n, t } = useTranslation();
  
  // Determine localization for Mercado Pago based on user's website language
  const isPortuguese = i18n.language === 'pt-BR';
  
  // Map our supported locales to Mercado Pago supported locales
  // This ensures the payment interface language matches the website language and currency
  const getMercadoPagoLocale = () => {
    if (isPortuguese) return 'pt-BR';
    // Return es-MX for Mexican Pesos to ensure proper form validators
    if (currency === 'MXN') return 'es-MX';
    return 'en-US';
  };
  
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
        setError(isPortuguese ? 'Falha ao verificar status de pagamento' : 'Failed to check payment status');
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [isOpen, isPortuguese]);

  // Create payment preference when component mounts and payments are enabled
  useEffect(() => {
    if (!isOpen || !paymentEnabled || !hedgeData) return;
    
    const createPreference = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Calculate hedge cost based on amount
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        
        // Use simulation data if available for more accurate fee calculation
        let hedgeCost: number;
        if (
          simulation?.costDetails != null &&
          typeof simulation.costDetails.hedgeCost === 'number'
        ) {
          // The correct fee is in simulation.costDetails.hedgeCost, not simulation.totalCost
          hedgeCost = simulation.costDetails.hedgeCost;
          console.log('[MercadoPayoSDKModal] Using simulation hedgeCost:', hedgeCost);
        } else {
          // Fallback to the simple percentage calculation
          throw new Error(isPortuguese ? 'Falha ao inicializar modal de pagamento' : 'Failed to initialize payment modal');
        }
        
        // Calculate margin amount (defaults to 2x hedgeCost if not provided)
        const marginAmount = hedgeData.margin ? Number(hedgeData.margin) : hedgeCost * 2;
        
        // Total payment is the sum of fees and margin
        const paymentAmount = Number((hedgeCost + marginAmount).toFixed(2));
        
        console.log(`[MercadoPayoSDKModal] Creating payment preference for ${paymentAmount} ${currency} (Fees: ${hedgeCost.toFixed(2)}, Margin: ${marginAmount.toFixed(2)})`);
        
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
              // Use appropriate identification type based on currency
              ...(currency === 'BRL' ? {
                identification: {
                  type: 'CPF',
                  number: '219585466'
                }
              } : {}) // Omit identification for MXN to avoid validation errors
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
          throw new Error(isPortuguese 
            ? 'Dados de preferência inválidos retornados pelo servidor' 
            : 'Invalid preference data returned from server');
        }
        
        setPreferenceId(data.id);
        setPublicKey(data.public_key);
        
        // Get the user's preferred locale for Mercado Pago
        const mpLocale = getMercadoPagoLocale();
        console.log(`[MercadoPayoSDKModal] Current website language: ${i18n.language}, using Mercado Pago locale: ${mpLocale}`);
        
        // Initialize Mercado Pago with the correct locale based on the user's website language
        initMercadoPago(data.public_key, {
          locale: mpLocale
        });
        
        setLoading(false);
      } catch (error) {
        console.error('[MercadoPayoSDKModal] Error creating preference:', error);
        setError(isPortuguese ? 'Falha ao inicializar pagamento' : 'Failed to initialize payment');
        setLoading(false);
      }
    };
    
    createPreference();
  }, [isOpen, paymentEnabled, hedgeData, currency, simulation, i18n.language, isPortuguese]);
  
  // Calculate amount from hedge data for payment
  const calculateTotalPaymentAmount = () => {
    if (!hedgeData) return 0;
    
    const hedgeAmount = Math.abs(Number(hedgeData.amount));
    let hedgeCost;
    
    // Use simulation data if available for more accurate fee calculation
    if (simulation) {
      // The correct fee is in simulation.costDetails.hedgeCost, not simulation.totalCost
      hedgeCost = simulation.costDetails.hedgeCost;
    } else {
      // Fallback to the simple percentage calculation
      hedgeCost = hedgeAmount * 0.0025; // 0.25% cost
    }
    
    // Calculate margin amount (defaults to 2x hedgeCost if not provided)
    const marginAmount = hedgeData.margin ? Number(hedgeData.margin) : hedgeCost * 2;
    
    // Total payment is the sum of fees and margin
    return Number((hedgeCost + marginAmount).toFixed(2));
  };
  
  const paymentAmount = calculateTotalPaymentAmount();
    
  // Handler functions
  const onReady = () => {
    console.log('[MercadoPayoSDKModal] Payment brick ready');
    setLoading(false); // Ensure loading is set to false when ready
  };
  
  const onError = (error: any) => {
    console.error('[MercadoPayoSDKModal] Payment error:', error);
    // Format the error message properly
    let errorMessage = isPortuguese ? 'Ocorreu um erro inesperado' : 'An unexpected error occurred';
    
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
    
    setError(isPortuguese ? `Erro de pagamento: ${errorMessage}` : `Payment error: ${errorMessage}`);
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
          title: isPortuguese ? 'Pagamento bem-sucedido' : 'Payment successful',
          description: isPortuguese ? 'Sua ordem de proteção foi registrada.' : 'Your hedge order has been placed.',
          variant: 'default',
        });
        onClose();
      } else {
        setError(isPortuguese 
          ? `Pagamento ${result.status}: ${result.statusDetail || 'Por favor, tente novamente.'}` 
          : `Payment ${result.status}: ${result.statusDetail || 'Please try again.'}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('[MercadoPayoSDKModal] Error processing payment:', error);
      setError(isPortuguese 
        ? 'Erro ao processar pagamento. Por favor, tente novamente.' 
        : 'Error processing payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPortuguese ? 'Complete o Pagamento para Registrar Proteção' : 'Complete Payment to Place Hedge'}
          </DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>{isPortuguese ? 'Processando seu pagamento...' : 'Processing your payment...'}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            <p className="font-semibold">{isPortuguese ? 'Erro' : 'Error'}</p>
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={onClose}
            >
              {isPortuguese ? 'Fechar' : 'Close'}
            </Button>
          </div>
        )}
        
        {!loading && !error && (
          <>
            {paymentEnabled && preferenceId && publicKey ? (
              <div className="min-h-[300px]">
                {/* Showing debug information */}
                <div className="bg-muted p-3 rounded-md text-xs mb-3">
                  <p><strong>{isPortuguese ? 'Detalhes do Pagamento:' : 'Payment Details:'}</strong></p>
                  <p>{isPortuguese ? 'Moeda:' : 'Currency:'} {currency}</p>
                  {hedgeData && (
                    <>
                      <p>{isPortuguese ? 'Valor da Proteção:' : 'Hedge Amount:'} {Math.abs(Number(hedgeData.amount)).toLocaleString()}</p>
                      
                      {/* Get the fees from the simulation result if available */}
                      {simulation ? (
                        <>
                          <p>{isPortuguese ? 'Taxas:' : 'Fees:'} {simulation.costDetails.hedgeCost.toFixed(2)} {currency}</p>
                          <p>{isPortuguese ? 'Margem:' : 'Margin:'} {hedgeData.margin ? Number(hedgeData.margin).toFixed(2) : (simulation.costDetails.hedgeCost * 2).toFixed(2)} {currency}</p>
                          <p>{isPortuguese ? 'Pagamento Total:' : 'Total Payment:'} {paymentAmount.toFixed(2)} {currency}</p>
                        </>
                      ) : (
                        <>
                          {/* Fallback for when simulation is not available */}
                          <p>{isPortuguese ? 'Taxas:' : 'Fees:'} {(Math.abs(Number(hedgeData.amount)) * 0.0025).toFixed(2)} {currency}</p>
                          <p>{isPortuguese ? 'Margem:' : 'Margin:'} {hedgeData.margin ? Number(hedgeData.margin).toFixed(2) : (Math.abs(Number(hedgeData.amount)) * 0.0025 * 2).toFixed(2)} {currency}</p>
                          <p>{isPortuguese ? 'Pagamento Total:' : 'Total Payment:'} {paymentAmount.toFixed(2)} {currency}</p>
                        </>
                      )}
                    </>
                  )}
                  <p className="mt-2"><strong>{isPortuguese ? 'Info para Depuração:' : 'Debug Info:'}</strong></p>
                  <p>Public Key: {publicKey || 'Not available'}</p>
                  <p>Preference ID: {preferenceId?.substring(0, 10) + '...' || 'Not available'}</p>
                  <p>Language: {i18n.language} | MP Locale: {getMercadoPagoLocale()}</p>
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
                      // Allow all debit cards for MXN but exclude for BRL
                      debitCard: currency === 'MXN' ? 'all' : [], 
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
                        title: isPortuguese ? 'Pagamento de teste processado' : 'Test payment processed',
                        description: isPortuguese ? 'Sua ordem de proteção foi registrada.' : 'Your hedge order has been placed.',
                        variant: 'default',
                      });
                      onClose();
                    }
                  }}
                >
                  {isPortuguese ? 'Teste: Continuar sem pagamento' : 'Test: Continue without payment'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="mb-4">
                  {isPortuguese 
                    ? 'O processamento de pagamentos está desativado neste ambiente.' 
                    : 'Payment processing is disabled in this environment.'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isPortuguese 
                    ? 'Em um ambiente de produção, você completaria o pagamento antes de registrar sua proteção.' 
                    : 'In a production environment, you would complete payment before placing your hedge.'}
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
                  {isPortuguese ? 'Continuar sem pagamento' : 'Continue without payment'}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}