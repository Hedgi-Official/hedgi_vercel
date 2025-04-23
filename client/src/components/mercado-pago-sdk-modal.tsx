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
import { SimulationResult } from "./currency-simulator";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null;
  currency: string;
  simulation?: SimulationResult | null;
}

export function MercadoPayoSDKModal({
  isOpen,
  onClose,
  onSuccess,
  hedgeData,
  currency,
  simulation
}: PaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const { i18n, t } = useTranslation();

  const isPortuguese = i18n.language === 'pt-BR';
  const getMercadoPagoLocale = () => isPortuguese ? 'pt-BR' : 'en-US';

  // 1) Fetch backend “is payment globally enabled?” flag
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/payment/status')
      .then(r => r.json())
      .then(data => {
        console.log('[MP] /api/payment/status →', data);
        setPaymentEnabled(!!data.enabled);
        setLoading(false);
      })
      .catch(err => {
        console.error('[MP] status check error', err);
        setError(isPortuguese
          ? 'Falha ao verificar status de pagamento'
          : 'Failed to check payment status');
        setLoading(false);
      });
  }, [isOpen, isPortuguese]);

  // 2) Create preference only for BRL + paymentEnabled + hedgeData
  useEffect(() => {
    if (!isOpen || !paymentEnabled || !hedgeData) return;

    // **Early exit if not BRL**
    if (currency !== 'BRL') {
      console.warn('[MP] currency not BRL, skipping MP init:', currency);
      setError(isPortuguese
        ? 'Pagamentos só disponíveis em BRL por enquanto'
        : 'Payments are only supported in BRL at the moment');
      setLoading(false);
      return;
    }

    const createPreference = async () => {
      setLoading(true);
      setError(null);
      try {
        const hedgeAmount = Math.abs(Number(hedgeData.amount));
        let hedgeCost: number;

        // try simulation
        if (simulation?.costDetails?.hedgeCost != null) {
          hedgeCost = simulation.costDetails.hedgeCost;
          console.log('[MP] using simulation hedgeCost:', hedgeCost);
        } else {
          hedgeCost = hedgeAmount * 0.0025;
          console.log('[MP] no simulation → default fee:', hedgeCost);
        }

        const marginAmount = hedgeData.margin
          ? Number(hedgeData.margin)
          : hedgeCost * 2;

        const totalAmount = Number((hedgeCost + marginAmount).toFixed(2));
        console.log(`[MP] totalAmount=${totalAmount} ${currency}`);

        const resp = await fetch('/api/payment/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            currency,
            description: `Hedge ${hedgeAmount} ${hedgeData.targetCurrency}/${hedgeData.baseCurrency}`,
            payer: {
              email: 'customer@example.com',
              name: 'Test Customer',
              identification: { type: 'CPF', number: '219585466' }
            }
          })
        });

        const data = await resp.json();
        console.log('[MP] /preference response →', data);

        if (data.enabled === false) {
          console.log('[MP] server says payments disabled');
          setLoading(false);
          return;
        }
        if (!data.id || !data.public_key) {
          throw new Error('Invalid preference data');
        }

        setPreferenceId(data.id);
        setPublicKey(data.public_key);
        initMercadoPago(data.public_key, { locale: getMercadoPagoLocale() });
        setLoading(false);
      } catch (err: any) {
        console.error('[MP] createPreference failed:', err);
        setError(isPortuguese
          ? 'Falha ao inicializar pagamento'
          : 'Failed to initialize payment');
        setLoading(false);
      }
    };

    createPreference();
  }, [isOpen, paymentEnabled, hedgeData, currency, simulation, isPortuguese]);

  // Helper to compute payment amount for display
  const computeAmount = () => {
    if (!hedgeData) return 0;
    const amt = Math.abs(Number(hedgeData.amount));
    const fee = simulation?.costDetails?.hedgeCost ?? amt * 0.0025;
    const margin = hedgeData.margin ? Number(hedgeData.margin) : fee * 2;
    return Number((fee + margin).toFixed(2));
  };
  const paymentAmount = computeAmount();

  // Render
  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPortuguese
              ? 'Complete o Pagamento para Registrar Proteção'
              : 'Complete Payment to Place Hedge'}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>{isPortuguese ? 'Processando...' : 'Processing...'}</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-100 text-red-800 p-4 rounded my-4">
            <p className="font-semibold">{isPortuguese ? 'Erro' : 'Error'}</p>
            <p>{error}</p>
            <Button onClick={onClose} className="mt-2">
              {isPortuguese ? 'Fechar' : 'Close'}
            </Button>
          </div>
        )}

        {!loading && !error && (
          paymentEnabled && currency === 'BRL' && preferenceId && publicKey ? (
            <>
              <div className="bg-gray-100 p-3 rounded text-sm mb-4">
                <p><strong>{isPortuguese ? 'Pagamento:' : 'Payment:'}</strong></p>
                <p>{paymentAmount} {currency}</p>
              </div>
              <Payment
                initialization={{ amount: paymentAmount, preferenceId }}
                customization={{
                  visual: { hideFormTitle: true },
                  paymentMethods: { creditCard: 'all' }
                }}
                onReady={() => setLoading(false)}
                onError={err => {
                  console.error('[MP Brick] error', err);
                  setError(isPortuguese
                    ? 'Pagamento falhou'
                    : 'Payment widget error');
                }}
                onSubmit={formData => {
                  setLoading(true);
                  fetch('/api/payment/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ preferenceId, formData })
                  })
                  .then(r => r.json())
                  .then(res => {
                    console.log('[MP] /process →', res);
                    setLoading(false);
                    if (res.status === 'approved' || res.status === 'in_process') {
                      onSuccess(hedgeData!);
                      toast({
                        title: isPortuguese ? 'Pagamento OK' : 'Payment successful',
                        description: isPortuguese
                          ? 'Sua ordem de proteção foi registrada.'
                          : 'Your hedge was placed.',
                      });
                      onClose();
                    } else {
                      setError(isPortuguese
                        ? `Pagamento ${res.status}`
                        : `Payment ${res.status}`);
                    }
                  })
                  .catch(err => {
                    console.error('[MP] /process error', err);
                    setError(isPortuguese
                      ? 'Erro ao processar pagamento'
                      : 'Error processing payment');
                    setLoading(false);
                  });
                }}
              />
            </>
          ) : (
            // Fallback UI: either non-BRL or server disabled payments
            <div className="py-8 text-center">
              <p className="mb-4">
                {isPortuguese
                  ? 'Pagamentos desativados neste ambiente.'
                  : 'Payment processing is disabled.'}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (hedgeData) onSuccess(hedgeData);
                  onClose();
                }}
              >
                {isPortuguese ? 'Continuar sem pagamento' : 'Continue without payment'}
              </Button>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
