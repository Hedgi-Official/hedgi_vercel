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
  installments: number;
  payer: {
    email: string;
    identification: { type: string; number: string };
  };
}
interface BrickAdditionalData {
  paymentTypeId: string;
}

export function MercadoPayoSDKModal({
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
    if (!isOpen || !hedgeData) return;

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
    if (!hedgeData) return;
    setLoading(true);
    setError(null);

    // Build v1 Orders payload **exactly** as MP expects:
    // (we assume your backend expects this shape)
    const externalRef =
      paymentTrackingToken ||
      `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const body = {
      type: "online",
      processing_mode: "automatic",
      total_amount: paymentAmount.toFixed(2), // string, e.g. "100.00"
      external_reference: externalRef.substring(0, 64),
      payer: {
        email: "JohnDoe@hedgi.ai",
      },
      transactions: {
        payments: [
          {
            amount: paymentAmount.toFixed(2), // string
            payment_method: {
              id: "master", // placeholder; real token comes from Brick
              type: "credit_card",
              token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // dummy 32-char
            },
            installments: 1,
          },
        ],
      },
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

      // Now that we have orderId & publicKey, render the Card Payment Brick
      const mercadoPago = new window.MercadoPago(data.publicKey, {
        locale: isPortuguese ? "pt-BR" : "en-US",
      });
      const bricksBuilder = mercadoPago.bricks();
      renderCardPaymentBrick(bricksBuilder, paymentAmount, data.orderId);
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
  // 3) renderCardPaymentBrick: called once we have publicKey & orderId
  //
  const renderCardPaymentBrick = async (
    bricksBuilder: any,
    amount: number,
    externalRef: string
  ) => {
    const settings = {
      initialization: {
        amount: amount, // e.g. 100.00
        external_reference: externalRef,
      },
      callbacks: {
        onReady: () => {
          // Brick is ready; hide your spinner if you have one
          setLoading(false);
        },
        onError: (error: unknown) => {
          console.error("❌ Brick error:", error);
          setError(isPortuguese ? "Erro ao carregar interface de pagamento." : "Failed to load payment interface.");
          setLoading(false);
        },
        onSubmit: (formData: BrickFormData, additionalData: BrickAdditionalData) => {
          // Called when user clicks “Pay” in the brick.
          // formData.token is the REAL card token (≥32 chars)
          return new Promise<void>((resolve, reject) => {
            const submitData = {
              type: "online",
              total_amount: String(formData.transaction_amount), // must be a string
              external_reference: externalRef,
              processing_mode: "automatic",
              transactions: {
                payments: [
                  {
                    amount: String(formData.transaction_amount),
                    payment_method: {
                      id: formData.payment_method_id,
                      type: additionalData.paymentTypeId,
                      token: formData.token, // 👈 real token from Brick
                      installments: formData.installments,
                    },
                  },
                ],
              },
              payer: {
                email: formData.payer.email,
              },
            };

            fetch("/api/payment/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(submitData),
            })
              .then((response) => response.json())
              .then((json) => {
                console.log("✔️ /api/payment/order →", json);
                if (json.error) {
                  console.error("❌ Payment failed:", json.error);
                  reject(json.error);
                  return;
                }
                // Success! Pass the payment ID (or order ID) back
                onSuccess(hedgeData!, json.orderId || "unknown_id");
                onClose();
                resolve();
              })
              .catch((error) => {
                console.error("❌ Error calling /api/payment/order:", error);
                reject(error);
              });
          });
        },
      },
    };

    // ‼️ Render the Brick into your container div
    window.cardPaymentBrickController = await bricksBuilder.create(
      "cardPayment",
      "cardPaymentBrick_container",
      settings
    );
  };

  //
  // 4) “Test Payment” button (dev mode)
  //
  const handleTestPayment = () => {
    if (!hedgeData) return;
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

        {/* ▶️ This is where the Card Payment Brick will be injected */}
        {!SKIP_PAYMENTS && (
          <div className="my-4">
            <div
              id="cardPaymentBrick_container"
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
              {error && (
                <div style={{ fontSize: 14, opacity: 0.7 }}>
                  {isPortuguese
                    ? "Aqui aparecerá a interface de pagamento."
                    : "Payment interface will appear here when ready."}
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
