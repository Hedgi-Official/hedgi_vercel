import { useState, useEffect } from "react";
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
import { useTranslation } from "react-i18next";
import { SimulationResult } from "./currency-simulator";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    hedgeData: Omit<
      Hedge,
      "id" | "userId" | "status" | "createdAt" | "completedAt"
    >,
    paymentToken?: string
  ) => void;
  hedgeData:
    | Omit<
        Hedge,
        "id" | "userId" | "status" | "createdAt" | "completedAt"
      >
    | null;
  currency: string;
  simulation?: SimulationResult | null;
}

declare global {
  interface Window {
    MercadoPago: any;
    cardPaymentBrickController?: any;
  }
}

interface BrickFormData {
  transaction_amount: number;
  payment_method_id: string;
  token: string; // real card token (≥32 chars)
  payer: {
    email: string;
    identification: { type: string; number: string };
  };
}
interface BrickAdditionalData {
  paymentTypeId: string;
}

export function MercadoPaySDKModal({
  isOpen,
  onClose,
  onSuccess,
  hedgeData,
  currency,
  simulation,
}: PaymentModalProps) {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [paymentTrackingToken, setPaymentTrackingToken] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const isPortuguese = i18n.language === "pt-BR";

  // Dev‐mode flag: if true, skip real payment brick
  const SKIP_PAYMENTS = false;

  // Compute final payment amount (fees + margin + etc.)
  const paymentAmount = (() => {
    if (!hedgeData) return 0;
    const amt = Math.abs(Number(hedgeData.amount));
    const cost = simulation?.costDetails.hedgeCost ?? amt * 0.0025;
    const margin = hedgeData.margin ? +hedgeData.margin : cost * 2;
    return Number((cost + margin).toFixed(2));
  })();

  //
  // 1) When modal opens with hedgeData, load the MP SDK and then create an Order
  //
  useEffect(() => {
    console.log("🔍 [MercadoPaySDKModal] useEffect triggered with:", { isOpen, hedgeData: !!hedgeData });

    if (!isOpen || !hedgeData) {
      console.log("❌ [MercadoPaySDKModal] Skipping useEffect - isOpen:", isOpen, "hedgeData:", !!hedgeData);
      return;
    }

    console.log("✅ [MercadoPaySDKModal] Proceeding with modal initialization");

    // Generate a tracking token (for our records)
    const trackingToken = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPaymentTrackingToken(trackingToken);

    // Dynamically load the MercadoPago SDK
    const loadSDK = () =>
      new Promise<void>((resolve, reject) => {
        if (window.MercadoPago) return resolve();
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("MP SDK load failed"));
        document.head.appendChild(script);
      });

    loadSDK()
      .then(() => {
        // SDK is ready → create the MP Order
        createOrder();
      })
      .catch((err) => {
        console.error("❌ Error loading MP SDK:", err);
        setError(isPortuguese ? "Falha ao carregar sistema de pagamento." : "Failed to load payment system.");
        setLoading(false);
      });
  }, [isOpen, hedgeData]);

  //
  // 2) createOrder: POST to our backend /api/payment/order (v1 Orders)
  //
  const createOrder = async (retryCount = 0) => {
    console.log("🚀 [createOrder] Function called with hedgeData:", !!hedgeData);

    if (!hedgeData) {
      console.log("❌ [createOrder] No hedgeData available, returning");
      return;
    }

    console.log("✅ [createOrder] Starting order creation process");
    setLoading(true);
    setError(null);

    // Build v2 Preferences payload as expected by our server:
    const externalRef =
      paymentTrackingToken ||
      `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const body = {
      type: "online",
      external_reference: externalRef.substring(0, 64),
      items: [
        {
          title: `Hedge Protection - ${currency}`,
          description: `Currency hedge for ${hedgeData.amount} ${currency}`,
          category_id: "services",
          quantity: 1,
          unit_price: paymentAmount,
        },
      ],
      payer: {
        email: "testuser@example.com",
        name: "John Doe",
        identification: {
          type: "CPF",
          number: "12345678901",
        },
      },
      back_urls: {
        success: `${window.location.origin}/payment/success`,
        failure: `${window.location.origin}/payment/failure`,
        pending: `${window.location.origin}/payment/pending`,
      },
      auto_return: "approved",
    };

    console.log("➡️ [createOrder] Sending to /api/payment/order:", body);

    try {
      const resp = await fetch("/api/payment/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const text = await resp.json().catch(() => ({ error: "Network" }));
        throw new Error(text.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      console.log("✅ Order response:", data);

      if (!data.orderId || !data.publicKey) {
        throw new Error("Invalid response: missing orderId or publicKey");
      }

      setOrderId(data.orderId);
      setPublicKey(data.publicKey);

      // Now that we have orderId & publicKey, render the Payment Brick
      const mercadoPago = new window.MercadoPago(data.publicKey, {
        locale: isPortuguese ? "pt-BR" : "en-US",
      });
      const bricksBuilder = mercadoPago.bricks();
      renderPaymentBrick(bricksBuilder, paymentAmount, data.orderId);
    } catch (e: any) {
      console.error("❌ Error creating payment order:", e);
      if (retryCount < 2 && e.message.includes("Network")) {
        return setTimeout(() => createOrder(retryCount + 1), 2000);
      }
      setError(isPortuguese ? "Falha ao inicializar pagamento. Use o modo de teste." : "Failed to initialize payment. Use test mode.");
      setLoading(false);
    }
  };

  //
  // 3) renderPaymentBrick: called once we have publicKey & orderId (using Payment Brick instead)
  //
  const renderPaymentBrick = async (
    bricksBuilder: any,
    amount: number,
    orderIdFromServer: string
  ) => {
    console.log("🔨 [renderPaymentBrick] Starting to render Payment Brick with amount:", amount, "orderId:", orderIdFromServer);

    try {
      const settings = {
        initialization: {
          amount: amount,
          preferenceId: orderIdFromServer, // Use preferenceId for Payment Brick
        },
        callbacks: {
          onReady: () => {
            console.log("✅ [renderPaymentBrick] Payment Brick is ready");
            setLoading(false);
          },
          onError: (error: unknown) => {
            console.error("❌ [renderPaymentBrick] Payment Brick error:", error);
            setError(isPortuguese ? "Erro ao carregar interface de pagamento." : "Failed to load payment interface.");
            setLoading(false);
          },
          onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
            console.log("💳 [renderPaymentBrick] Payment Brick onSubmit called with selectedPaymentMethod:", selectedPaymentMethod);
            console.log("💳 [renderPaymentBrick] formData:", formData);

            if (!hedgeData) {
              console.error("❌ [renderPaymentBrick] No hedgeData available");
              return;
            }

            // Extract the payment token from formData
            const paymentToken = formData.token || selectedPaymentMethod.token;
            console.log("🔑 [renderPaymentBrick] Extracted payment token:", paymentToken);

            if (!paymentToken) {
              console.error("❌ [renderPaymentBrick] No payment token found");
              setError(isPortuguese ? "Token de pagamento não encontrado." : "Payment token not found.");
              return;
            }

            // Build the payment payload for Flask - proper structure
            const paymentPayload = {
              type: "online",
              external_reference: paymentTrackingToken || `payment_${Date.now()}`,
              payer: formData.payer || {
                email: "testuser@example.com",
                identification: { type: "CPF", number: "12345678901" }
              },
              payment_details: {
                total_amount: amount.toString(),
                processing_mode: "automatic",
                transactions: {
                  payments: [{
                    amount: amount.toString(),
                    installments: formData.installments || 1,
                    payment_method: {
                      id: selectedPaymentMethod.id || formData.payment_method_id,
                      type: selectedPaymentMethod.type || "credit_card",
                      token: paymentToken,
                    }
                  }]
                }
              }
            };

            console.log("📦 [renderPaymentBrick] Sending payment payload:", paymentPayload);

            try {
              // Send the payment with real card token to our server
              const response = await fetch("/api/payment/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentPayload),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Network error" }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
              }

              const result = await response.json();
              console.log("✅ [renderPaymentBrick] Payment successful:", result);

              // Show success message
              setError(null);
              setLoading(true);

              // Hide the payment brick container and show success message
              const container = document.getElementById("paymentBrick_container");
              if (container) {
                container.innerHTML = `
                  <div style="text-align: center; padding: 40px 20px; color: #10b981; font-size: 18px; font-weight: 600;">
                    ✅ ${isPortuguese ? "Pagamento bem-sucedido!" : "Payment successful!"}
                  </div>
                `;
              }

              // Extract payment ID from the response
              const paymentId = result.paymentId || result.id || paymentToken;

              // Short delay to show success message, then proceed with trade
              setTimeout(() => {
                console.log("🚀 [renderPaymentBrick] Calling onSuccess to place trade");
                onSuccess(hedgeData, paymentId);
                onClose();
              }, 1500);

            } catch (paymentError) {
              console.error("❌ [renderPaymentBrick] Payment processing error:", paymentError);
              setError(isPortuguese ? "Falha no processamento do pagamento." : "Payment processing failed.");
            }
          },
        },
        customization: {
          paymentMethods: {
            creditCard: "all",
            maxInstallments: 1
          }
        }
      };

      // Create the Payment Brick
      console.log("🔨 [renderPaymentBrick] Creating Payment Brick with settings:", settings);

      // Check if container exists
      const container = document.getElementById("paymentBrick_container");
      if (!container) {
        throw new Error("Container 'paymentBrick_container' not found in DOM");
      }

      console.log("🔨 [renderPaymentBrick] Container found, creating Payment Brick...");
      window.paymentBrickController = await bricksBuilder.create(
        "payment", // Use "payment" for Payment Brick
        "paymentBrick_container",
        settings
      );
      console.log("✅ [renderPaymentBrick] Payment Brick created successfully:", window.paymentBrickController);

    } catch (brickError) {
      console.error("❌ [renderPaymentBrick] Failed to create Payment Brick:", brickError);
      setError(isPortuguese ? "Falha ao criar interface de pagamento." : "Failed to create payment interface.");
      setLoading(false);
    }
  };

  //
  // 4) "Test Payment" button (dev mode)
  //
  const handleTestPayment = () => {
    if (!hedgeData || paymentCompleted) return;
    setPaymentCompleted(true);
    const testToken = paymentTrackingToken || `test_payment_${Date.now()}`;
    onSuccess(hedgeData, testToken);
    toast({
      title: isPortuguese ? "Modo Dev: Proteção registrada" : "Dev mode: Hedge placed",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPortuguese
              ? "Complete o Pagamento para Registrar Proteção"
              : "Complete Payment to Place Hedge"}
          </DialogTitle>
        </DialogHeader>

        {/* Payment Details Summary */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">
            {isPortuguese ? "Detalhes do Pagamento:" : "Payment Details:"}
          </h3>
          {hedgeData && (
            <div className="text-sm space-y-1">
              <p>
                {isPortuguese ? "Moeda:" : "Currency:"} {currency}
              </p>
              <p>
                {isPortuguese ? "Valor da Proteção:" : "Hedge Amount:"}{" "}
                {hedgeData.amount}
              </p>
              <p>
                {isPortuguese ? "Taxa:" : "Fees:"}{" "}
                {(
                  simulation?.costDetails.hedgeCost ??
                  Math.abs(Number(hedgeData.amount)) * 0.0025
                ).toFixed(2)}{" "}
                {currency}
              </p>
              <p>
                {isPortuguese ? "Margem:" : "Margin:"}{" "}
                {(
                  hedgeData.margin
                    ? +hedgeData.margin
                    : (simulation?.costDetails.hedgeCost ??
                        Math.abs(Number(hedgeData.amount)) * 0.0025) * 2
                ).toFixed(2)}{" "}
                {currency}
              </p>
              <p className="font-semibold">
                {isPortuguese ? "Total a Pagar:" : "Total Payment:"}{" "}
                {paymentAmount} {currency}
              </p>
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && !SKIP_PAYMENTS && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>
              {isPortuguese
                ? "Carregando sistema de pagamento..."
                : "Loading payment system..."}
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded my-4">
            <p className="font-semibold">
              {isPortuguese ? "Erro" : "Error"}
            </p>
            <p>{error}</p>
            <Button className="mt-2" onClick={() => createOrder()}>
              {isPortuguese ? "Tentar Novamente" : "Try Again"}
            </Button>
          </div>
        )}

        {/* ▶️ This is where the Payment Brick will be injected */}
        {!SKIP_PAYMENTS && (
          <div className="my-4">
            <div
              id="paymentBrick_container"
              style={{
                minHeight: "400px",
                width: "100%",
                border: error ? "2px dashed #ccc" : "none",
                borderRadius: "8px",
                padding: error ? "20px" : "0",
                textAlign: error ? "center" : "left",
                color: error ? "#666" : "inherit",
              }}
            >
              {(error || loading) && (
                <div style={{ fontSize: 14, opacity: 0.7 }}>
                  {loading 
                    ? (isPortuguese ? "Carregando interface de pagamento..." : "Loading payment interface...")
                    : (isPortuguese ? "Aqui aparecerá a interface de pagamento." : "Payment interface will appear here when ready.")
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Always‐visible Test Payment button for dev */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button variant="outline" className="w-full" onClick={handleTestPayment}>
            {isPortuguese
              ? "Usar Pagamento de Teste (Desenvolvimento)"
              : "Use Test Payment (Development)"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}