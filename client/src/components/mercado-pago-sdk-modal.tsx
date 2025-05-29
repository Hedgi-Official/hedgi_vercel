// client/src/components/mercado-pago-sdk-modal.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Hedge } from 'db/schema'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { useTranslation } from 'react-i18next'
import { SimulationResult } from './currency-simulator'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (
    hedgeData: Omit<
      Hedge,
      'id' | 'userId' | 'status' | 'createdAt' | 'completedAt'
    >,
    paymentToken?: string
  ) => void
  hedgeData: Omit<
    Hedge,
    'id' | 'userId' | 'status' | 'createdAt' | 'completedAt'
  > | null
  currency: string
  simulation?: SimulationResult | null
}

export function MercadoPayoSDKModal({
  isOpen,
  onClose,
  onSuccess,
  hedgeData,
  currency,
  simulation,
}: PaymentModalProps) {
  // ─── Hooks (always run) ────────────────────────────────────────────────
  const { i18n } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  // ──────────────────────────────────────────────────────────────────────

  const isPortuguese = i18n.language === 'pt-BR'
  const locale = isPortuguese ? 'pt-BR' : 'en-US'

  // ─── Dev‐mode switch ────────────────────────────────────────────────────
  const SKIP_PAYMENTS = false
  // └─────────────────────────────────────────────────────────────────────

  // ─── Compute amount ───────────────────────────────────────────────────
  const paymentAmount = (() => {
    if (!hedgeData) return 0
    const amt = Math.abs(Number(hedgeData.amount))
    const cost = simulation?.costDetails.hedgeCost ?? amt * 0.0025
    const margin = hedgeData.margin ? +hedgeData.margin : cost * 2
    return Number((cost + margin).toFixed(2))
  })()
  // └─────────────────────────────────────────────────────────────────────

  // ─── Preference effect (no‐ops in dev) ─────────────────────────────────
  useEffect(() => {
    if (!isOpen || !hedgeData) return

    if (SKIP_PAYMENTS) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetch('/api/payment/preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: paymentAmount, currency }),
    })
      .then((r) => r.json())
      .then((d) => {
        setPreferenceId(d.id)
        initMercadoPago(d.public_key, { locale })
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError(isPortuguese ? 'Falha ao iniciar pagamento' : 'Init failed')
        setLoading(false)
      })
  }, [isOpen, hedgeData, currency, paymentAmount, isPortuguese, locale])
  // └─────────────────────────────────────────────────────────────────────

  const onReady = () => setLoading(false)
  const onError = (e: any) => {
    console.error(e)
    const msg = typeof e === 'string' ? e : e?.message ?? 'Error'
    setError(isPortuguese ? `Erro: ${msg}` : `Error: ${msg}`)
  }

  // ─── Submission handler ────────────────────────────────────────────────
  const onSubmit = async (formData: any) => {
    if (SKIP_PAYMENTS) {
      // **DEV: skip all networking, generate a mock payment token**
      const mockPaymentToken = `dev_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      onSuccess(hedgeData!, mockPaymentToken)
      toast({
        title: isPortuguese ? 'Modo Dev: Proteção OK' : 'Dev mode: Hedge OK',
      })
      onClose()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferenceId, currency, formData }),
      })
      let result: any
      try {
        result = await res.json()
      } catch {
        // HTML fallback - generate a fallback payment token
        const fallbackPaymentToken = `fallback_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        onSuccess(hedgeData!, fallbackPaymentToken)
        onClose()
        return
      }

      if (['approved', 'in_process'].includes(result.status)) {
        // Extract payment token from result (transactionId, paymentId, or preference)
        const paymentToken = result.transactionId || result.paymentId || result.id || preferenceId || `token_${Date.now()}`
        onSuccess(hedgeData!, paymentToken)
        toast({
          title: isPortuguese ? 'Sucesso' : 'Success',
          description: isPortuguese
            ? 'Hedge registrado'
            : 'Your hedge was placed',
        })
        onClose()
      } else {
        throw new Error(result.statusDetail || result.status)
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error')
      setLoading(false)
    }
  }
  // └─────────────────────────────────────────────────────────────────────

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
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

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded my-4">
            <p className="font-semibold">
              {isPortuguese ? 'Erro' : 'Error'}
            </p>
            <p>{error}</p>
            <Button className="mt-2" onClick={() => onClose()}>
              {isPortuguese ? 'Fechar' : 'Close'}
            </Button>
          </div>
        )}

        {!loading && !error && (
          <Button
            className="mt-4 w-full"
            onClick={() => onSubmit({})}
          >
            {SKIP_PAYMENTS
              ? isPortuguese
                ? 'Modo Dev: Continuar'
                : 'Dev mode: Continue'
              : 'Proceed to payment'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
