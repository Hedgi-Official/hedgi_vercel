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
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [mp, setMp] = useState<any>(null)
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [paymentTrackingToken, setPaymentTrackingToken] = useState<string | null>(null);

  const isPortuguese = i18n.language === "pt-BR";

  // Dev‐mode flag: if true, skip the real payment brick and go straight to test payment
  const SKIP_PAYMENTS = false;

  // Compute final payment amount (fees + margin + etc.)
  const paymentAmount = (() => {
    if (!hedgeData) return 0;
    const amt = Math.abs(Number(hedgeData.amount));
    const cost = simulation?.costDetails.hedgeCost ?? amt * 0.0025;
    const margin = hedgeData.margin ? +hedgeData.margin : cost * 2;
    return Number((cost + margin).toFixed(2));
  })();

  // 1) When modal opens and we have hedgeData, load the MP SDK and then create an Order
  useEffect(() => {
    if (!isOpen || !hedgeData) {
      return;
    }

    // Generate a tracking token (for your own record)
    const trackingToken = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPaymentTrackingToken(trackingToken);

    // 1a) Dynamically load MercadoPago SDK script
    const loadSDK = () =>
      new Promise<void>((resolve, reject) => {
        if (window.MercadoPago) {
          return resolve();
        }
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("MP SDK load failed"));
        document.head.appendChild(script);
      });

    loadSDK()
      .then(() => {
        // 1b) Once SDK is loaded, POST to /api/payment/order to get { orderId, publicKey }
        createOrder();
      })
      .catch((err) => {
        console.error("❌ Error loading MP SDK:", err);
        setError(
          isPortuguese
            ? "Falha ao carregar sistema de pagamento."
            : "Failed to load payment system."
        );
        setLoading(false);
      });
  }, [isOpen, hedgeData]);

  // 2) CreateOrder: call your backend to hit Flask (/api/payment/order)
  const createOrder = async (retryCount = 0) => {
    if (!hedgeData) return;

    setLoading(true);
    setError(null);

    // Build v2 Checkout‐Order body exactly as MP expects:
    const externalRef =
      paymentTrackingToken ||
      `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const body = {
      type: "online",
      external_reference: externalRef.substring(0, 64), // ≤ 64 chars
      items: [
        {
          title: `Hedge ${hedgeData.baseCurrency}/${hedgeData.targetCurrency}`,
          description: `Hedge protection for ${hedgeData.amount} ${hedgeData.baseCurrency}`,
          category_id: "others",
          quantity: 1,
          unit_price: paymentAmount,
        },
      ],
      payer: {
        email: "JohnDoe@hedgi.ai",
        name: "John Doe",
        identification: {
          type: currency === "BRL" ? "CPF" : "CURP",
          number: currency === "BRL" ? "11111111111" : "123456789",
        },
      },
      back_urls: {
        success: `${window.location.origin}/payment/success`,
        failure: `${window.location.origin}/payment/failure`,
        pending: `${window.location.origin}/payment/pending`,
      },
      auto_return: "approved",
    };

    try {
      const resp = await fetch("/api/payment/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        // Try retry on network glitch
        const text = await resp.json().catch(() => ({ error: "Network" }));
        throw new Error(text.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      console.log("✅ Preference response:", data);

      // MP returns { id: "...", public_key: "TEST-..." }
      if (!data.orderId || !data.publicKey) {
        throw new Error("Invalid response: missing orderId or publicKey");
      }

      setOrderId(data.orderId);
      setPublicKey(data.publicKey);

      // 3) Now that we have publicKey & orderId, initialize the Card Payment Brick
      initializeCheckoutV2(data.publicKey, data.orderId);
    } catch (e: any) {
      console.error("❌ Error creating payment order:", e);
      if (retryCount < 2 && e.message.includes("Network")) {
        return setTimeout(() => createOrder(retryCount + 1), 2000);
      }
      setError(
        isPortuguese
          ? "Falha ao inicializar pagamento. Use o modo de teste."
          : "Failed to initialize payment. Use test mode."
      );
      setLoading(false);
    }
  };

  // 4) initializeCheckoutV2: actually build a MercadoPago instance and render the CardPayment brick
  const initializeCheckoutV2 = async (pk: string, oid: string) => {
    console.log("[PaymentModal] initializeCheckoutV2 →", { pk, oid });

    // 4a) Create MercadoPago instance
    let mercadoPago: any;
    try {
      mercadoPago = new window.MercadoPago(pk, {
        locale: isPortuguese ? "pt-BR" : "en-US",
      });
      setMp(mercadoPago);
    } catch (mpErr) {
      console.error("❌ Could not instantiate MercadoPago:", mpErr);
      setError(
        isPortuguese
          ? "Não foi possível inicializar Mercado Pago."
          : "Could not initialize Mercado Pago."
      );
      setLoading(false);
      return;
    }

    // 4b) Grab the bricksBuilder
    const bricksBuilder = mercadoPago.bricks();

    // 4c) Render the Card Payment Brick into our container
    try {
      await bricksBuilder.create("cardPayment", "cardPaymentBrick_container", {
        initialization: {
          amount: paymentAmount, // must be > 0
          // You *could* pass `external_reference: oid` here as well, but not strictly required
        },
        callbacks: {
          onReady: () => {
            console.log("✅ CardPayment Brick is ready");
            setLoading(false);
          },
          onError: (brickErr: any) => {
            console.error("❌ Brick error:", brickErr);
            setError(
              isPortuguese
                ? "Erro ao carregar interface de pagamento."
                : "Failed to create payment interface."
            );
            setLoading(false);
          },
          onSubmit: (formData: any, additionalData: any) => {
            console.log("▶️ Brick onSubmit:", { formData, additionalData });
            return new Promise((resolve, reject) => {
              // Build the v2 Payments payload exactly as MP docs require:
              const submitData = {
                type: "online",
                total_amount: String(formData.transaction_amount), // "00.00"
                external_reference: oid,
                processing_mode: "automatic",
                transactions: {
                  payments: [
                    {
                      amount: String(formData.transaction_amount),
                      payment_method: {
                        id: formData.payment_method_id,
                        type: additionalData.paymentTypeId,
                        token: formData.token,
                        installments: formData.installments,
                      },
                    },
                  ],
                },
                payer: {
                  email: formData.payer.email,
                  identification: formData.payer.identification,
                },
              };

              fetch("/process_order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(submitData),
              })
                .then((r) => r.json())
                .then((json) => {
                  console.log("✔️ /process_order →", json);
                  if (json.error) {
                    console.error("❌ Payment failed:", json.error);
                    return reject(json.error);
                  }
                  // Success! Pass the payment ID back to Dashboard
                  const paymentToken = json.id || json.payment_id || "unknown_id";
                  resolve(json);
                  onSuccess(hedgeData!, paymentToken);
                  onClose();
                })
                .catch((err) => {
                  console.error("❌ Error calling /process_order:", err);
                  reject(err);
                });
            });
          },
        },
      });

      // If we reach here, the Brick will show up in the <div> below
    } catch (brickCreationError) {
      console.error("❌ Could not create CardPayment Brick:", brickCreationError);
      setError(
        isPortuguese
          ? "Falha ao criar formulário de cartão."
          : "Failed to create card form."
      );
      setLoading(false);
    }
  };

  // 5) If user wants “Test Payment,” skip the real flow:
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
