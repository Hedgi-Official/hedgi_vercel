import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Hedge {
  amount: number;
  baseCurrency: string;
  targetCurrency: string;
  duration: number;
  margin?: number;
}

interface Simulation {
  costDetails: {
    hedgeCost: number;
  };
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hedgeData: Hedge, paymentToken: string) => void;
  hedgeData: Hedge | null;
  currency: string;
  simulation?: Simulation;
}

declare global {
  interface Window {
    MercadoPago: any;
    paymentBrickController: any;
  }
}

export function MercadoPaySDKModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  hedgeData, 
  currency, 
  simulation 
}: PaymentModalProps) {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [paymentTrackingToken, setPaymentTrackingToken] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [brickCreated, setBrickCreated] = useState(false);
  const hasInitializedBrick = useRef(false);

  const isPortuguese = i18n.language === "pt-BR";

  // Compute paymentAmount
  const paymentAmount = (() => {
    if (!hedgeData) return 0;
    const amt = Math.abs(Number(hedgeData.amount));
    const cost = simulation?.costDetails.hedgeCost ?? amt * 0.0025;
    const margin = hedgeData.margin ? +hedgeData.margin : cost * 2;
    return Number((cost + margin).toFixed(2));
  })();

  useEffect(() => {
    console.log("🔍 [MercadoPaySDKModal] useEffect triggered:", { isOpen, hedgeData: !!hedgeData });

    if (!isOpen || !hedgeData) {
      console.log("❌ [MercadoPaySDKModal] Skipping useEffect because isOpen:", isOpen, "hedgeData:", !!hedgeData);
      return;
    }

    if (hasInitializedBrick.current) {
      console.log("⚠️ [MercadoPaySDKModal] Brick already initialized, skipping duplicate");
      return;
    }
    hasInitializedBrick.current = true;

    console.log("✅ [MercadoPaySDKModal] Proceeding with modal initialization");
    setLoading(true);
    setError(null);
    setOrderId(null);
    setPublicKey(null);
    setBrickCreated(false);
    setPaymentCompleted(false);

    // Wipe out any old container HTML
    const container = document.getElementById("paymentBrick_container");
    if (container) container.innerHTML = "";

    // Tear down any previous controller
    if (window.paymentBrickController) {
      try {
        console.log("🧹 Cleaning up previous payment brick controller");
        window.paymentBrickController.unmount();
      } catch (e) {
        console.log("❗ Previous payment brick cleanup error:", e);
      }
      window.paymentBrickController = null;
    }

    // Generate a new tracking token
    const trackingToken = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPaymentTrackingToken(trackingToken);

    // 1) Dynamically load the MercadoPago SDK
    const loadSDK = () =>
      new Promise<void>((resolve, reject) => {
        if (window.MercadoPago) {
          console.log("✅ MercadoPago SDK already loaded");
          return resolve();
        }
        console.log("⏳ Loading MercadoPago SDK...");
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => {
          console.log("✅ MercadoPago SDK loaded successfully");
          resolve();
        };
        script.onerror = () => reject(new Error("MP SDK load failed"));
        document.head.appendChild(script);
      });

    // 2) Main function that handles everything
    const createAndRender = async () => {
      try {
        console.log("🚀 Starting createAndRender process");
        await loadSDK();

        // Build the payload to create an "order" (v2 preference) on your server
        const externalRef = trackingToken.substring(0, 64);
        const body = {
          type: "online",
          external_reference: externalRef,
          items: [
            {
              title: `Hedge Protection – ${currency}`,
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
        const resp = await fetch("/api/payment/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        
        if (!resp.ok) {
          const errJson = await resp.json().catch(() => ({ error: "Network" }));
          throw new Error(errJson.error || `HTTP ${resp.status}`);
        }
        
        const data = await resp.json();
        console.log("✅ Order response:", data);

        if (!data.orderId || !data.publicKey) {
          throw new Error("Invalid response: missing orderId or publicKey");
        }

        setOrderId(data.orderId);
        setPublicKey(data.publicKey);

        // 3) Render the Brick only after we have publicKey + orderId
        console.log("🧱 Creating payment brick with publicKey:", data.publicKey);
        const mercadoPago = new window.MercadoPago(data.publicKey, {
          locale: isPortuguese ? "pt-BR" : "en-US",
        });
        const bricksBuilder = mercadoPago.bricks();

        // Double-check before creating a Brick
        if (window.paymentBrickController || brickCreated) {
          console.log("⚠️ [renderPaymentBrick] Already created a Brick, skipping");
          return;
        }

        const container2 = document.getElementById("paymentBrick_container");
        if (!container2) {
          throw new Error("Container 'paymentBrick_container' not found");
        }

        const settings = {
          initialization: {
            amount: paymentAmount,
            preferenceId: data.orderId,
          },
          callbacks: {
            onReady: () => {
              console.log("✅ [renderPaymentBrick] Brick is ready");
              setLoading(false);
            },
            onError: (err: unknown) => {
              console.error("❌ [renderPaymentBrick] Brick error:", err);
              setError(isPortuguese ? "Erro ao carregar interface de pagamento." : "Failed to load payment interface.");
              setLoading(false);
            },
            onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
              console.log("💳 [renderPaymentBrick] onSubmit triggered:", selectedPaymentMethod, formData);
              
              if (!hedgeData) {
                console.error("❌ No hedgeData available for payment");
                return;
              }

              const paymentToken = formData.token || selectedPaymentMethod.token;
              if (!paymentToken) {
                console.error("❌ No payment token found");
                setError(isPortuguese ? "Token de pagamento não encontrado." : "Payment token not found.");
                return;
              }

              console.log("🔑 Payment token extracted:", paymentToken);

              const paymentPayload = {
                type: "online",
                external_reference: trackingToken,
                payer: formData.payer || {
                  email: "testuser@example.com",
                  identification: { type: "CPF", number: "12345678901" }
                },
                payment_details: {
                  total_amount: paymentAmount.toString(),
                  processing_mode: "automatic",
                  transactions: {
                    payments: [
                      {
                        amount: paymentAmount.toString(),
                        installments: formData.installments || 1,
                        payment_method: {
                          id: selectedPaymentMethod.id || formData.payment_method_id,
                          type: selectedPaymentMethod.type || "credit_card",
                          token: paymentToken,
                        },
                      },
                    ],
                  },
                },
                hedgeData,
              };

              console.log("📦 Sending payment payload:", paymentPayload);

              try {
                const response2 = await fetch("/api/payment/order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(paymentPayload),
                });
                
                const result = await response2.json();
                console.log("✅ [renderPaymentBrick] Payment response:", result);

                const paymentStatus = result.response?.status || result.status;
                const isApproved = paymentStatus === "approved";

                if (response2.ok && isApproved) {
                  console.log("✅ Payment approved successfully!");

                  const paymentId = result.paymentId || result.id || result.response?.id || paymentToken;
                  setPaymentCompleted(true);

                  // Show "approved" banner with details
                  const hedgeAmount = Math.abs(Number(hedgeData.amount || 0));
                  const targetCurrency = hedgeData.targetCurrency || 'USD';
                  const duration = hedgeData.duration || 7;
                  
                  const bannerHtml = `
                    <div style="
                      text-align: center;
                      padding: 40px 20px;
                      color: #10b981;
                      font-size: 18px;
                      font-weight: 600;">
                      ✅ ${isPortuguese ? "Hedge realizado com sucesso!" : "Hedge successfully placed!"}
                      <div style="font-size: 14px; margin-top: 15px; font-weight: normal; color: #374151;">
                        <div style="margin-bottom: 8px;">
                          <strong>${isPortuguese ? "Valor:" : "Amount:"}</strong> ${hedgeAmount.toLocaleString()} ${currency}
                        </div>
                        <div style="margin-bottom: 8px;">
                          <strong>${isPortuguese ? "Par:" : "Pair:"}</strong> ${currency}/${targetCurrency}
                        </div>
                        <div>
                          <strong>${isPortuguese ? "Duração:" : "Duration:"}</strong> ${duration} ${isPortuguese ? "dias" : "days"}
                        </div>
                      </div>
                    </div>
                  `;
                  container2.innerHTML = bannerHtml;

                  // Tear down the Brick controller immediately
                  if (window.paymentBrickController) {
                    try {
                      console.log("🧹 Unmounting payment brick after success");
                      window.paymentBrickController.unmount();
                    } catch (_e) {
                      console.log("Cleanup error after success:", _e);
                    }
                    window.paymentBrickController = null;
                  }

                  console.log("🚀 Calling onSuccess with hedge data and payment ID");
                  onSuccess(hedgeData, paymentId);
                  return;
                } else {
                  console.error("❌ Payment not approved:", result);
                  const reason = result.status_detail || result.response?.status_detail || "unknown";
                  setPaymentCompleted(true);

                  container2.innerHTML = `
                    <div style="
                      text-align: center;
                      padding: 40px 20px;
                      color: #ef4444;
                      font-size: 18px;
                      font-weight: 600;">
                      ❌ ${isPortuguese ? "Pagamento rejeitado" : "Payment rejected"}
                      <div style="font-size: 14px; margin-top: 10px; font-weight: normal;">
                        ${isPortuguese ? "Motivo:" : "Reason:"} ${reason}
                      </div>
                    </div>
                  `;
                }
              } catch (err) {
                console.error("🚨 Payment-request failed:", err);
                setError(isPortuguese ? "Falha no processamento do pagamento." : "Payment processing failed.");
              }
            },
          },
          customization: {
            paymentMethods: { creditCard: "all", maxInstallments: 1 },
          },
        };

        // Actually create the Brick
        console.log("🏗️ Creating payment brick with settings:", settings);
        window.paymentBrickController = await bricksBuilder.create(
          "payment",
          "paymentBrick_container",
          settings
        );
        console.log("✅ [renderPaymentBrick] Brick created successfully:", window.paymentBrickController);
        setBrickCreated(true);
        
      } catch (err) {
        console.error("❌ createAndRender failed:", err);
        setError(isPortuguese ? "Falha ao inicializar pagamento." : "Failed to initialize payment.");
        setLoading(false);
      }
    };

    createAndRender();

    // CRITICAL: Cleanup function to handle React 18 Strict Mode double-mounting
    return () => {
      console.log("🧹 [MercadoPaySDKModal] Component unmounting - cleaning up payment brick");
      hasInitializedBrick.current = false;
      if (window.paymentBrickController) {
        try {
          console.log("🗑️ Unmounting payment brick controller on cleanup");
          window.paymentBrickController.unmount();
          window.paymentBrickController = null;
        } catch (e) {
          console.log("Cleanup error:", e);
        }
      }
    };
  }, [isOpen, hedgeData, paymentAmount, currency, isPortuguese]);

  // Reset all states when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log("🔄 [MercadoPaySDKModal] Modal closed, resetting all states");
      setLoading(true);
      setError(null);
      setOrderId(null);
      setPublicKey(null);
      setPaymentTrackingToken(null);
      setPaymentCompleted(false);
      setBrickCreated(false);
      hasInitializedBrick.current = false;
      
      // Clean up any remaining payment brick
      const container = document.getElementById("paymentBrick_container");
      if (container) {
        container.innerHTML = '';
      }
      
      if (window.paymentBrickController) {
        try {
          console.log("🧹 Cleaning up payment brick on modal close");
          window.paymentBrickController.unmount();
        } catch (e) {
          console.log("Modal close cleanup error:", e);
        }
        window.paymentBrickController = null;
      }
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPortuguese ? "Complete o Pagamento para Realizar Hedge" : "Complete Payment to Place Hedge"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <div>
            <h3 className="font-semibold mb-2">
              {isPortuguese ? "Detalhes do Pagamento:" : "Payment Details:"}
            </h3>
            <div className="text-sm space-y-1">
              <div><strong>{isPortuguese ? "Moeda:" : "Currency:"}</strong> {currency}</div>
              <div><strong>{isPortuguese ? "Valor do Hedge:" : "Hedge Amount:"}</strong> {hedgeData?.amount}</div>
              <div><strong>{isPortuguese ? "Taxas:" : "Fees:"}</strong> {(paymentAmount * 0.06).toFixed(2)} {currency}</div>
              <div><strong>{isPortuguese ? "Margem:" : "Margin:"}</strong> {(paymentAmount * 0.94).toFixed(2)} {currency}</div>
              <div><strong>{isPortuguese ? "Pagamento Total:" : "Total Payment:"}</strong> {paymentAmount.toFixed(2)} {currency}</div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">
                {isPortuguese ? "Carregando sistema de pagamento..." : "Loading payment system..."}
              </span>
            </div>
          )}

          {/* Payment Brick Container */}
          <div id="paymentBrick_container" className="min-h-[200px]"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}