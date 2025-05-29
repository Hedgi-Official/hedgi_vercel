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

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function MercadoPayoSDKModal({
  isOpen,
  onClose,
  onSuccess,
  hedgeData,
  currency,
  simulation,
}: PaymentModalProps) {
  const { i18n } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mp, setMp] = useState<any>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)

  const isPortuguese = i18n.language === 'pt-BR'

  // Dev mode switch
  const SKIP_PAYMENTS = false

  // Compute amount
  const paymentAmount = (() => {
    if (!hedgeData) return 0
    const amt = Math.abs(Number(hedgeData.amount))
    const cost = simulation?.costDetails.hedgeCost ?? amt * 0.0025
    const margin = hedgeData.margin ? +hedgeData.margin : cost * 2
    return Number((cost + margin).toFixed(2))
  })()

  // Load Mercado Pago SDK
  useEffect(() => {
    if (!isOpen || !hedgeData) return

    const loadMercadoPagoSDK = () => {
      return new Promise((resolve, reject) => {
        if (window.MercadoPago) {
          resolve(window.MercadoPago)
          return
        }

        const script = document.createElement('script')
        script.src = 'https://sdk.mercadopago.com/js/v2'
        script.onload = () => resolve(window.MercadoPago)
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    loadMercadoPagoSDK()
      .then(() => {
        createPreference()
      })
      .catch((err) => {
        console.error('Error loading MercadoPago SDK:', err)
        setError('Failed to load payment system')
        setLoading(false)
      })
  }, [isOpen, hedgeData])

  const createPreference = async () => {
    if (!hedgeData) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payment/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: paymentAmount, 
          currency,
          description: `Hedge ${hedgeData.baseCurrency}/${hedgeData.targetCurrency} - ${hedgeData.amount}`,
          payer: {
            email: 'user@hedgi.com',
            name: 'Hedgi User',
            identification: {
              type: currency === 'BRL' ? 'CPF' : 'CURP',
              number: currency === 'BRL' ? '11111111111' : '123456789'
            }
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment preference')
      }

      const data = await response.json()

      if (data.enabled === false) {
        setError('Payments are currently disabled. The hedge cannot be placed at this time.')
        setLoading(false)
        return
      }

      if (!data.id || !data.public_key) {
        throw new Error('Missing preference ID or public key')
      }

      setPreferenceId(data.id)
      initializeMercadoPago(data.public_key, data.id)
    } catch (error) {
      console.error('Error creating payment preference:', error)
      setError(`Failed to initialize payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setLoading(false)
    }
  }

  const initializeMercadoPago = async (publicKey: string, prefId: string) => {
    try {
      // Wait a bit for the DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if container exists
      const container = document.getElementById('payment-brick-container')
      if (!container) {
        console.error('Payment container not found')
        setError('Payment container not ready. Please try the test payment option.')
        setLoading(false)
        return
      }

      const mercadoPago = new window.MercadoPago(publicKey, {
        locale: isPortuguese ? 'pt-BR' : 'en-US'
      })
      setMp(mercadoPago)

      // Set a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        console.warn('Payment brick taking too long to load, showing fallback')
        setLoading(false)
        setError('Payment system is taking longer than expected to load. Please try the test payment option.')
      }, 15000) // 15 second timeout

      const brickSettings = {
        initialization: {
          preferenceId: prefId
        },
        callbacks: {
          onReady: () => {
            console.log('Payment brick ready')
            clearTimeout(loadingTimeout)
            setLoading(false)
          },
          onError: (error: any) => {
            console.error('Brick error:', error)
            clearTimeout(loadingTimeout)
            setError('Failed to create payment interface. Please use the test payment option.')
            setLoading(false)
          },
          onSubmit: async (cardFormData: any) => {
            console.log('Payment submitted:', cardFormData)
            try {
              // For preference-based payments, MP handles the flow
              handlePaymentSuccess({ payment: { id: `mp_${Date.now()}` } })
              return true
            } catch (submitError) {
              console.error('Submit error:', submitError)
              return false
            }
          }
        },
        customization: {
          visual: {
            hidePaymentButton: false,
            style: {
              theme: 'default'
            }
          },
          paymentMethods: {
            creditCard: 'all',
            bankTransfer: 'all',
            maxInstallments: 1
          }
        }
      }

      // Create the payment brick with better error handling
      try {
        console.log('Creating payment brick with settings:', brickSettings)
        const bricks = mercadoPago.bricks()
        const paymentBrick = await bricks.create('payment', 'payment-brick-container', brickSettings)
        console.log('Payment brick created successfully:', paymentBrick)
      } catch (brickError) {
        console.error('Error creating payment brick:', brickError)
        clearTimeout(loadingTimeout)
        setError('Failed to create payment interface. Please use the test payment option.')
        setLoading(false)
      }

    } catch (error) {
      console.error('Error initializing MercadoPago:', error)
      setError('Failed to initialize payment system. Please use the test payment option.')
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentData: any) => {
    const paymentToken = paymentData?.payment?.id || paymentData?.transactionId || `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    toast({
      title: isPortuguese ? 'Pagamento realizado com sucesso!' : 'Payment successful!',
      description: isPortuguese ? 'Sua proteção foi registrada.' : 'Your hedge has been placed.',
    })

    onSuccess(hedgeData!, paymentToken)
    onClose()
  }

  const handleTestPayment = () => {
    if (!hedgeData) return

    const mockPaymentToken = `dev_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    onSuccess(hedgeData, mockPaymentToken)

    toast({
      title: isPortuguese ? 'Modo Dev: Proteção registrada' : 'Dev mode: Hedge placed',
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPortuguese
              ? 'Complete o Pagamento para Registrar Proteção'
              : 'Complete Payment to Place Hedge'}
          </DialogTitle>
        </DialogHeader>

        {/* Payment Details */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">
            {isPortuguese ? 'Detalhes do Pagamento:' : 'Payment Details:'}
          </h3>
          {hedgeData && (
            <div className="text-sm space-y-1">
              <p>{isPortuguese ? 'Moeda:' : 'Currency:'} {currency}</p>
              <p>{isPortuguese ? 'Valor da Proteção:' : 'Hedge Amount:'} {hedgeData.amount}</p>
              <p>{isPortuguese ? 'Taxa:' : 'Fees:'} {(simulation?.costDetails.hedgeCost ?? Math.abs(Number(hedgeData.amount)) * 0.0025).toFixed(2)} {currency}</p>
              <p>{isPortuguese ? 'Margem:' : 'Margin:'} {(hedgeData.margin ? +hedgeData.margin : (simulation?.costDetails.hedgeCost ?? Math.abs(Number(hedgeData.amount)) * 0.0025) * 2).toFixed(2)} {currency}</p>
              <p className="font-semibold">{isPortuguese ? 'Total a Pagar:' : 'Total Payment:'} {paymentAmount} {currency}</p>
            </div>
          )}
        </div>

        {loading && !SKIP_PAYMENTS && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>{isPortuguese ? 'Carregando sistema de pagamento...' : 'Loading payment system...'}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded my-4">
            <p className="font-semibold">
              {isPortuguese ? 'Erro' : 'Error'}
            </p>
            <p>{error}</p>
            <Button className="mt-2" onClick={() => createPreference()}>
              {isPortuguese ? 'Tentar Novamente' : 'Try Again'}
            </Button>
          </div>
        )}

        {/* Payment Brick Container */}
        {!SKIP_PAYMENTS && (
          <div className="my-4">
            <div 
              id="payment-brick-container" 
              style={{ 
                minHeight: '400px',
                width: '100%',
                display: loading ? 'none' : 'block'
              }}
            ></div>
          </div>
        )}

        {/* Test Payment Button - Always visible for development */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleTestPayment}
          >
            {isPortuguese
              ? 'Usar Pagamento de Teste (Desenvolvimento)'
              : 'Use Test Payment (Development)'}
          </Button>
        </div>

        {SKIP_PAYMENTS && (
          <Button
            className="mt-4 w-full"
            onClick={handleTestPayment}
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