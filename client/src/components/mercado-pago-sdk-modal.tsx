
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
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null)
  // ──────────────────────────────────────────────────────────────────────

  const isPortuguese = i18n.language === 'pt-BR'

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

  // ─── Listen for payment completion messages ──────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PAYMENT_SUCCESS') {
        console.log('Payment success message received:', event.data)
        
        // Close the payment window
        if (paymentWindow && !paymentWindow.closed) {
          paymentWindow.close()
        }
        
        // Generate payment token and call success callback
        const paymentToken = `window_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        onSuccess(hedgeData!, paymentToken)
        
        toast({
          title: isPortuguese ? 'Sucesso' : 'Success',
          description: isPortuguese
            ? 'Hedge registrado'
            : 'Your hedge was placed',
        })
        
        onClose()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [paymentWindow, hedgeData, onSuccess, onClose, isPortuguese])

  // ─── Open payment window ──────────────────────────────────────────────
  const openPaymentWindow = () => {
    if (!hedgeData) return

    // Determine which payment page to use based on currency
    const paymentPage = currency === 'MXN' ? '/payment-mxn.html' : '/payment-brl.html'
    
    // Build the URL with hedge data as query parameters
    const params = new URLSearchParams({
      amount: hedgeData.amount,
      baseCurrency: hedgeData.baseCurrency,
      targetCurrency: hedgeData.targetCurrency,
      rate: hedgeData.rate,
      duration: hedgeData.duration.toString(),
      tradeDirection: hedgeData.tradeDirection,
      margin: hedgeData.margin || '0'
    })

    const paymentUrl = `${paymentPage}?${params.toString()}`
    console.log('Opening payment window with URL:', paymentUrl)

    // Open the payment window
    const newWindow = window.open(
      paymentUrl,
      'payment',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )

    if (newWindow) {
      setPaymentWindow(newWindow)
      setLoading(false)
      
      // Check if window was closed without completing payment
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed)
          setPaymentWindow(null)
          // Don't automatically close the modal - let user try again
        }
      }, 1000)
    } else {
      setError(isPortuguese ? 'Falha ao abrir janela de pagamento' : 'Failed to open payment window')
      setLoading(false)
    }
  }

  // ─── Dev mode submission handler ───────────────────────────────────────
  const handleDevModeSubmit = () => {
    if (!hedgeData) return
    
    const mockPaymentToken = `dev_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    onSuccess(hedgeData, mockPaymentToken)
    
    toast({
      title: isPortuguese ? 'Modo Dev: Proteção OK' : 'Dev mode: Hedge OK',
    })
    
    onClose()
  }

  // ─── Initialize when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (isOpen && hedgeData) {
      setLoading(true)
      setError(null)
      
      if (SKIP_PAYMENTS) {
        setLoading(false)
      } else {
        // Small delay to ensure modal is fully rendered
        setTimeout(() => {
          openPaymentWindow()
        }, 500)
      }
    }
  }, [isOpen, hedgeData])

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
            <p>{isPortuguese ? 'Abrindo pagamento...' : 'Opening payment...'}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded my-4">
            <p className="font-semibold">
              {isPortuguese ? 'Erro' : 'Error'}
            </p>
            <p>{error}</p>
            <Button className="mt-2" onClick={() => openPaymentWindow()}>
              {isPortuguese ? 'Tentar Novamente' : 'Try Again'}
            </Button>
          </div>
        )}

        {!loading && !error && !SKIP_PAYMENTS && (
          <div className="py-4 text-center">
            <p className="mb-4">
              {isPortuguese 
                ? 'Uma janela de pagamento foi aberta. Complete seu pagamento na nova janela.'
                : 'A payment window has been opened. Complete your payment in the new window.'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {isPortuguese
                ? `Valor a pagar: ${paymentAmount} ${currency}`
                : `Amount to pay: ${paymentAmount} ${currency}`}
            </p>
            <Button variant="outline" onClick={() => openPaymentWindow()}>
              {isPortuguese ? 'Reabrir Pagamento' : 'Reopen Payment'}
            </Button>
          </div>
        )}

        {SKIP_PAYMENTS && !loading && (
          <Button
            className="mt-4 w-full"
            onClick={handleDevModeSubmit}
          >
            {isPortuguese
              ? 'Modo Dev: Continuar'
              : 'Dev mode: Continue'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
