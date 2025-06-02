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
  console.log('[PaymentModal] render – props:', {
    isOpen,
    onClose,
    onSuccess,
    hedgeData,
    currency,
    simulation,
  })
  const { i18n } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mp, setMp] = useState<any>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [paymentTrackingToken, setPaymentTrackingToken] = useState<string | null>(null)

  const isPortuguese = i18n.language === 'pt-BR'

  // Dev mode switch
  const SKIP_PAYMENTS = false

  // Compute amount
  const paymentAmount = (() => {
    if (!hedgeData) {
      console.log('[PaymentModal] No hedge data for amount calculation')
      return 0
    }
    const amt = Math.abs(Number(hedgeData.amount))
    const cost = simulation?.costDetails.hedgeCost ?? amt * 0.0025
    const margin = hedgeData.margin ? +hedgeData.margin : cost * 2
    const finalAmount = Number((cost + margin).toFixed(2))
    
    console.log('[PaymentModal] Amount calculation breakdown:')
    console.log('  - hedgeData.amount:', hedgeData.amount)
    console.log('  - amt (absolute):', amt)
    console.log('  - cost:', cost)
    console.log('  - margin:', margin)
    console.log('  - finalAmount:', finalAmount)
    
    return finalAmount
  })()

  // Load Mercado Pago SDK
  useEffect(() => {
    console.log('[PaymentModal] useEffect triggered - isOpen:', isOpen, 'hedgeData:', hedgeData)
    if (!isOpen || !hedgeData) {
      console.log('[PaymentModal] Skipping SDK load - modal closed or no hedge data')
      return
    }

    // Generate unique payment tracking token when modal opens
    const trackingToken = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setPaymentTrackingToken(trackingToken)
    console.log('[PaymentModal] Generated payment tracking token:', trackingToken)

    console.log('[PaymentModal] Starting SDK load process...')
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

  const createPreference = async (retryCount = 0) => {
    console.log('[PaymentModal] createPreference called - retryCount:', retryCount)
    if (!hedgeData) {
      console.log('[PaymentModal] No hedge data, returning early')
      return
    }

    console.log('[PaymentModal] hedgeData:', hedgeData)
    console.log('[PaymentModal] paymentAmount calculated:', paymentAmount)
    
    try {
      setLoading(true)
      setError(null)

      console.log(`Creating payment preference (attempt ${retryCount + 1})...`)
      console.log('[PaymentModal] Payment amount being sent:', paymentAmount)
      console.log('[PaymentModal] Currency:', currency)

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
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('Preference response:', data)

      if (data.enabled === false) {
        setError('Payments are currently disabled. Please use the test payment option.')
        setLoading(false)
        return
      }

      if (!data.id || !data.public_key) {
        throw new Error('Invalid response: missing preference ID or public key')
      }

      setPreferenceId(data.id)

      // Add a small delay before initializing MP
      await new Promise(resolve => setTimeout(resolve, 500))

      initializeMercadoPago(data.public_key, data.id)
    } catch (error) {
      console.error('Error creating payment preference:', error)

      // Retry logic for network errors
      if (retryCount < 2 && (error instanceof Error && error.message.includes('Network'))) {
        console.log(`Retrying preference creation in 2 seconds...`)
        setTimeout(() => createPreference(retryCount + 1), 2000)
        return
      }

      setError('Failed to initialize payment. Please use the test payment option.')
      setLoading(false)
    }
  }

  const initializeMercadoPago = async (publicKey: string, prefId: string) => {
    try {
      console.log('Initializing MercadoPago with public key:', publicKey.substring(0, 20) + '...')
      console.log('Preference ID:', prefId)

      // Wait for DOM to be ready and check container multiple times
      let container = null
      let attempts = 0
      const maxAttempts = 10

      while (!container && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        container = document.getElementById('payment-brick-container')
        attempts++
      }

      if (!container) {
        console.error('Payment container not found after', maxAttempts, 'attempts')
        setError('Payment container not ready. Please try the test payment option.')
        setLoading(false)
        return
      }

      // Clear any existing content in the container
      container.innerHTML = ''

      // Validate the public key format
      if (!publicKey || publicKey === 'DEV_PUBLIC_KEY' || !publicKey.startsWith('TEST-') && !publicKey.startsWith('APP_USR-')) {
        console.error('Invalid public key format:', publicKey)
        setError('Invalid payment configuration. Please use the test payment option.')
        setLoading(false)
        return
      }

      // Initialize MercadoPago with proper error handling
      let mercadoPago
      try {
        mercadoPago = new window.MercadoPago(publicKey, {
          locale: isPortuguese ? 'pt-BR' : 'en-US'
        })
        setMp(mercadoPago)
      } catch (mpError) {
        console.error('Error creating MercadoPago instance:', mpError)
        setError('Failed to initialize payment system. Please use the test payment option.')
        setLoading(false)
        return
      }

      // Set a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        console.warn('Payment brick taking too long to load')
        setLoading(false)
        setError('Payment system is taking longer than expected to load. Please use the test payment option.')
      }, 20000) // 20 second timeout

      const brickSettings = {
        initialization: {
          preferenceId: prefId,
          amount: paymentAmount,     // Must be > 0
          currencyId: currency       // e.g. "BRL" or "USD"
        },
        callbacks: {
          onReady: () => {
            console.log('Payment brick ready')
            clearTimeout(loadingTimeout)
            setLoading(false)
            setError(null) // Clear any previous errors
          },
          onError: (error: any) => {
            console.error('Brick error:', error)
            clearTimeout(loadingTimeout)
            setError('Failed to create payment interface. Please use the test payment option.')
            setLoading(false)
          },
          onSubmit: async (cardFormData: any) => {
            console.log('Payment submitted - full cardFormData:', JSON.stringify(cardFormData, null, 2))
            try {
              // Mercado Pago returns different structures depending on the payment method
              // Look for payment ID in multiple possible locations
              let mpPaymentId = null;
              
              // Check various possible paths for the payment ID
              if (cardFormData?.payment_id) {
                mpPaymentId = cardFormData.payment_id;
              } else if (cardFormData?.id) {
                mpPaymentId = cardFormData.id;
              } else if (cardFormData?.payment?.id) {
                mpPaymentId = cardFormData.payment.id;
              } else if (cardFormData?.token) {
                mpPaymentId = cardFormData.token;
              } else if (cardFormData?.payment_method_id && cardFormData?.issuer_id) {
                // For credit cards, we might get payment_method_id instead
                mpPaymentId = `${cardFormData.payment_method_id}_${Date.now()}`;
              }
              
              console.log('Extracted payment ID:', mpPaymentId)
              console.log('Payment data structure:', {
                hasPaymentId: !!cardFormData?.payment_id,
                hasId: !!cardFormData?.id,
                hasPaymentObject: !!cardFormData?.payment,
                hasToken: !!cardFormData?.token,
                hasPaymentMethodId: !!cardFormData?.payment_method_id,
                paymentMethodId: cardFormData?.payment_method_id,
                issuerId: cardFormData?.issuer_id
              })
              
              if (!mpPaymentId) {
                console.error('No payment ID found in cardFormData:', cardFormData)
                // For development/testing, allow proceeding with a test token
                if (process.env.NODE_ENV === 'development') {
                  console.log('Development mode: using test payment token')
                  const testToken = `test_mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  handlePaymentSuccess({ payment: { id: testToken } })
                  return true
                }
                setError('Payment processing failed. Please try again.')
                return false
              }
              
              console.log('Verifying payment with ID:', mpPaymentId)
              
              // Verify the payment with our backend
              const verificationResponse = await fetch('/api/payment/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentId: mpPaymentId,
                  currency: currency,
                  cardFormData: cardFormData // Send full data for debugging
                })
              })
              
              if (!verificationResponse.ok) {
                const errorText = await verificationResponse.text()
                console.error('Payment verification failed:', errorText)
                
                // For development, allow test payments to proceed
                if (process.env.NODE_ENV === 'development' && mpPaymentId.includes('test_')) {
                  console.log('Development mode: allowing test payment to proceed')
                  handlePaymentSuccess({ payment: { id: mpPaymentId } })
                  return true
                }
                
                setError('Payment verification failed. Please try again.')
                return false
              }
              
              const verificationResult = await verificationResponse.json()
              console.log('Payment verification result:', verificationResult)
              
              // Check for approved status
              if (verificationResult.status === 'approved' || 
                  verificationResult.status === 'success' || 
                  verificationResult.verified === true) {
                console.log('Payment verified successfully')
                handlePaymentSuccess({ payment: { id: mpPaymentId } })
                return true
              } else {
                console.error('Payment not approved:', verificationResult)
                setError(`Payment status: ${verificationResult.status}. Please complete the payment.`)
                return false
              }
            } catch (submitError) {
              console.error('Payment submit error:', submitError)
              setError('Payment processing error. Please try again.')
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

      // Create the payment brick with comprehensive error handling
      try {
        console.log('Creating payment brick...')
        const bricks = mercadoPago.bricks()

        if (!bricks) {
          throw new Error('Failed to get bricks instance')
        }

        const paymentBrick = await bricks.create('payment', 'payment-brick-container', brickSettings)
        console.log('Payment brick created successfully')

        // Additional check to ensure the brick was actually created
        if (!paymentBrick) {
          throw new Error('Payment brick creation returned null')
        }

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

    // Use tracking token for test payments too
    const testToken = paymentTrackingToken || `test_payment_${Date.now()}`
    console.log('[PaymentModal] Using test payment token:', testToken)
    
    onSuccess(hedgeData, testToken)

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
                border: error ? '2px dashed #ccc' : 'none',
                borderRadius: '8px',
                padding: error ? '20px' : '0',
                textAlign: error ? 'center' : 'left',
                color: error ? '#666' : 'inherit'
              }}
            >
              {error && (
                <div style={{ fontSize: '14px', opacity: 0.7 }}>
                  Payment interface will appear here when ready
                </div>
              )}
            </div>
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