import { useState, useEffect, useRef } from "react";
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
    paymentBrickController?: any;
    statusScreenBrickController?: any;
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


class SimpleMutex {
  private _locked = false;
  private _waiting: Array<() => void> = [];

  /** 
   * Call `await acquire()` to wait for the lock. 
   * It returns a `release()` function you must call when done.
   */
  async acquire(): Promise<() => void> {
    if (this._locked) {
      // Already locked ⇒ wait until someone calls `release()`
      await new Promise<void>((resolve) => this._waiting.push(resolve));
    }
    // Now we have the lock
    this._locked = true;
    return () => {
      // Release: allow the next waiter (if any) to proceed
      this._locked = false;
      const next = this._waiting.shift();
      if (next) next();
    };
  }
}


const paymentBrickMutex = new SimpleMutex();


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
  const [isProcessing, setIsProcessing] = useState(false);
  const [brickCreated, setBrickCreated] = useState(false);

  // Add a ref to prevent React Strict Mode from creating duplicate bricks
  const hasInitializedBrick = useRef(false);

  // Add a ref to prevent duplicate brick creation
  const preventBrickRef = useRef(false);

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
    console.log("🔍 [MercadoPaySDKModal] useEffect triggered with:", { isOpen, hedgeData: !!hedgeData, paymentCompleted, brickCreated, isProcessing, preventBrickRef: preventBrickRef.current });

    // CRITICAL: Check preventBrickRef FIRST to prevent any brick creation after payment success
    if (preventBrickRef.current) {
      console.log("🛑 [MercadoPaySDKModal] preventBrickRef is true - blocking all brick creation");
      return;
    }

    if (!isOpen || !hedgeData || paymentCompleted || brickCreated || isProcessing) {
      console.log("❌ [MercadoPaySDKModal] Skipping useEffect - isOpen:", isOpen, "hedgeData:", !!hedgeData, "paymentCompleted:", paymentCompleted, "brickCreated:", brickCreated, "isProcessing:", isProcessing);
      return;
    }

    // Only initialize once per open (prevent React Strict Mode double-mount)
    if (hasInitializedBrick.current) {
      console.log("⚠️ [MercadoPaySDKModal] Brick already initialized, skipping duplicate");
      return;
    }
    hasInitializedBrick.current = true;

    console.log("✅ [MercadoPaySDKModal] Proceeding with modal initialization");

    // Set processing state immediately to prevent duplicate calls
    setIsProcessing(true);

    // Clear any existing payment brick first
    const container = document.getElementById("paymentBrick_container");
    if (container) {
      container.innerHTML = '';
    }

    // Destroy any existing payment brick controller
    if (window.paymentBrickController) {
      try {
        window.paymentBrickController.unmount();
      } catch (e) {
        console.log("Previous payment brick cleanup:", e);
      }
      window.paymentBrickController = null;
    }

    // Reset states for fresh start
    setLoading(true);
    setError(null);
    setOrderId(null);
    setPublicKey(null);
    setBrickCreated(false);

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
        setIsProcessing(false); // Reset processing state on error
      });

    // Cleanup function to handle React 18 Strict Mode double-mounting
    return () => {
      console.log("🧹 [MercadoPaySDKModal] Component unmounting - cleaning up payment brick");
      if (window.paymentBrickController) {
        try {
          window.paymentBrickController.unmount();
          window.paymentBrickController = null;
        } catch (e) {
          console.log("Unmount cleanup:", e);
        }
      }
    };
  }, [isOpen, hedgeData]);

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
      setIsProcessing(false);
      setBrickCreated(false);
      preventBrickRef.current = false;

      // Clean up any remaining payment brick
      const container = document.getElementById("paymentBrick_container");
      if (container) {
        container.innerHTML = '';
      }

      if (window.paymentBrickController) {
        try {
          window.paymentBrickController.unmount();
        } catch (e) {
          console.log("Modal close cleanup:", e);
        }
        window.paymentBrickController = null;
      }

      if (window.statusScreenBrickController) {
        try {
          window.statusScreenBrickController.unmount();
        } catch (e) {
          console.log("Status screen cleanup:", e);
        }
        window.statusScreenBrickController = null;
      }
      hasInitializedBrick.current = false;
    }
  }, [isOpen]);

  //
  // 2) createOrder: POST to our backend /api/payment/order (v1 Orders)
  //
  const createOrder = async (retryCount = 0) => {
    console.log("🚀 [createOrder] Function called with hedgeData:", !!hedgeData);

    // CRITICAL: Check preventBrickRef FIRST
    if (preventBrickRef.current) {
      console.log("🛑 [createOrder] preventBrickRef is true - blocking order creation");
      return;
    }

    // If we've already created a brick or payment is done, skip entirely
    if (brickCreated || paymentCompleted || isProcessing) {
      console.log("⚠️ [createOrder] Skipping because brickCreated:", brickCreated, "paymentCompleted:", paymentCompleted, "isProcessing:", isProcessing);
      return;
    }

    if (!hedgeData) {
      console.log("❌ [createOrder] No hedgeData available, returning");
      return;
    }

    // Prevent multiple simultaneous order creation calls
    if (orderId || publicKey) {
      console.log("⚠️ [createOrder] Order/publicKey already exists, skipping duplicate call");
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

    console.log("➡️ [createOrder] Sending to /api/checkout/preferences:", body);

    try {
      const resp = await fetch("/api/checkout/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              title: `Hedge Protection - ${currency}`,
              unit_price: paymentAmount,
              quantity: 1,
              currency_id: currency || "BRL",
            },
          ],
          payer: {
            email: "testuser@example.com",
            name: "John Doe",
            identification: { type: "CPF", number: "12345678901" },
          },
          back_urls: {
            success: `${window.location.origin}/payment/success`,
            failure: `${window.location.origin}/payment/failure`,
            pending: `${window.location.origin}/payment/pending`,
          },
          auto_return: "approved",
        }),
      });
      if (!resp.ok) {
        const error = await resp.json().catch(() => ({ error: "Network" }));
        throw new Error(error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      console.log("✅ Preference response:", data);
      if (!data.preferenceId || !data.publicKey) {
        throw new Error("Missing preferenceId or publicKey");
      }
      setPublicKey(data.publicKey);

      // Now initialize the Brick with data.preferenceId (NOT data.orderId)
      const mercadoPago = new window.MercadoPago(data.publicKey, {
        locale: isPortuguese ? "pt-BR" : "en-US",
      });
      const bricksBuilder = mercadoPago.bricks();
      renderPaymentBrick(bricksBuilder, paymentAmount, data.preferenceId);

      // Mark brick as created to prevent duplicates
      setBrickCreated(true);
      setIsProcessing(false);
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
    preferenceId: string
  ) => {
    console.log("🔨 [renderPaymentBrick] Starting to render Payment Brick", {
      paymentCompleted,
      brickCreated,
      windowPaymentController: !!window.paymentBrickController,
      preventBrickRef: preventBrickRef.current,
    });

    // CRITICAL: Check preventBrickRef IMMEDIATELY before acquiring lock
    if (preventBrickRef.current) {
      console.log("🛑 [renderPaymentBrick] preventBrickRef is true - aborting brick creation");
      return;
    }

    const release = await paymentBrickMutex.acquire();
    try {
      console.log("🔐 [renderPaymentBrick] acquired lock, proceeding…");

      // Check again after acquiring lock (double safety)
      if (preventBrickRef.current) {
        console.log("🛑 [renderPaymentBrick] preventBrickRef is true after lock - aborting");
        return;
      }

      // Check if we should still run (payment might already be done)
      if (paymentCompleted) {
        console.log(
          "⚠️ [renderPaymentBrick] paymentCompleted=true; skipping render"
        );
        return;
      }

    // ② If we already have a controller or flagged brickCreated, skip
    if (window.paymentBrickController || brickCreated) {
      console.log("⚠️ [renderPaymentBrick] Brick already exists; skipping");
      return;
    }

    try {
      const settings = {
        initialization: {
          amount: amount,
          preferenceId: preferenceId, // Use preferenceId for Payment Brick
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

            if (window.paymentBrickController) {
              try {
                window.paymentBrickController.unmount();
              } catch (e) {
                console.warn(
                  "⚠️ [renderPaymentBrick] failed to unmount Brick:",
                  e
                );
              }
              window.paymentBrickController = null;
            }
            // Clear flags so we can re-create on failure
            setBrickCreated(false);
            setPaymentCompleted(false);



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
                total_amount: paymentAmount.toString(),
                processing_mode: "automatic",
                transactions: {
                  payments: [{
                    amount: paymentAmount.toString(),
                    installments: formData.installments || 1,
                    payment_method: {
                      id: selectedPaymentMethod.id || formData.payment_method_id,
                      type: selectedPaymentMethod.type || "credit_card",
                      token: paymentToken,
                    }
                  }]
                }
              },
              // Include hedge data for automatic trade creation
              hedgeData: hedgeData
            };

            console.log("📦 [renderPaymentBrick] Sending payment payload:", paymentPayload);

            try {
                const response = await fetch("/api/payment/order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(paymentPayload),
                });

                const result = await response.json();
                console.log("✅ [renderPaymentBrick] Payment response:", result);

                // Check if the payment status is specifically "approved"
                // The status is nested in result.response.status, not at the top level

                const paymentStatus = result.response?.status || result.status;
                const isApproved = paymentStatus === "approved";

                if (response.ok && isApproved) {
                  // CRITICAL: Set preventBrickRef FIRST (synchronous, immediate)
                  preventBrickRef.current = true;

                  // Extract payment ID before setting other states
                  const paymentId = result.response?.id || result.id || paymentToken;

                  // Now set React states (these are batched and applied later)
                  setPaymentCompleted(true);
                  setBrickCreated(true);
                  setError(null);
                  setLoading(false);
                  hasInitializedBrick.current = true;

                  console.log("✅ [renderPaymentBrick] Payment approved successfully! preventBrickRef set to true");

                  // CRITICAL: Destroy Payment Brick completely before creating Status Screen
                  if (window.paymentBrickController) {
                    try {
                      console.log("🔥 Unmounting Payment Brick controller...");
                      window.paymentBrickController.unmount();
                      window.paymentBrickController = null;
                    } catch (e) {
                      console.warn("⚠️ failed to unmount Payment Brick:", e);
                    }
                  }

                  // Clear container completely to remove any Payment Brick remnants
                  const container = document.getElementById("paymentBrick_container");

                   if (container) {
                      container.innerHTML = ""; // wipe out old content
                      container.innerHTML = `
                        <div style="
                          text-align: center;
                          padding: 24px;
                          color: #10b981;
                          font-size: 18px;
                          font-weight: 600;
                        ">
                          ✅ ${isPortuguese ? "Hedge realizado com sucesso!" : "Hedge successfully placed!"}
                          <div style="
                            font-size: 14px;
                            margin-top: 15px;
                            font-weight: normal;
                            color: #374151;
                          ">
                            <div style="margin-bottom: 8px;">
                              <strong>${isPortuguese ? "Valor:" : "Amount:"}</strong> ${Math.abs(
                        Number(hedgeData.amount || 0)
                      ).toLocaleString()} ${hedgeData.baseCurrency || currency}
                            </div>
                            <div style="margin-bottom: 8px;">
                              <strong>${isPortuguese ? "Par:" : "Pair:"}</strong> ${
                        hedgeData.baseCurrency || currency
                      }/${hedgeData.targetCurrency || "USD"}
                            </div>
                            <div style="margin-bottom: 8px;">
                              <strong>${isPortuguese ? "Duração:" : "Duration:"}</strong> ${
                        hedgeData.duration || 7
                      } ${isPortuguese ? "dias" : "days"}
                            </div>
                            <div style="
                              margin-top: 20px;
                              padding: 15px;
                              background-color: #f0f9ff;
                              border-radius: 8px;
                              border-left: 4px solid #10b981;
                            ">
                              <strong style="color: #059669;">${
                                isPortuguese ? "Pagamento Aprovado" : "Payment Approved"
                              }</strong><br>
                              <span style="font-size: 12px; color: #6b7280;">ID: ${paymentId}</span>
                            </div>
                          </div>
                        </div>
                      `;
                    }
                  onClose();

                    // 6) Call onSuccess and then exit—no further code runs:
                    console.log("🚀 [renderPaymentBrick] Payment approved, calling onSuccess");
                  requestAnimationFrame(() => {
                    onSuccess(hedgeData, paymentId);
                  });
                    return
                } else {
                  // Payment failed or not approved
                  console.error("❌ Payment failed or not approved:", result);
                  const statusDetail = result.status_detail || result.response?.status_detail;
                  const reason = statusDetail || paymentStatus || "Payment not approved";

                  // Mark payment as completed to prevent further interactions
                  setPaymentCompleted(true);

                  // Clear any existing error state and loading state
                  setError(null);
                  setLoading(false);

                  // Extract payment ID for Status Screen Brick
                  const paymentId = result.paymentId || result.id || result.response?.id || paymentToken;

                  // Show Status Screen Brick for failed payment
                  const container = document.getElementById("paymentBrick_container");
                  if (container) {
                    // Create a new container specifically for the status screen
                    container.innerHTML = '<div id="statusScreenBrick_container"></div>';

                    try {
                      // Use a mock payment ID if we don't have a real one
                      const statusPaymentId = paymentId || '1234567890';

                      // Create Status Screen Brick for failed payment using the exact structure from your HTML
                      const statusSettings = {
                        initialization: {
                          paymentId: statusPaymentId.toString(),
                        },
                        customization: {
                          visual: {
                            hideStatusDetails: true,
                            hideTransactionDate: true,
                            style: {
                              theme: 'default',
                            },
                          },
                          backUrls: {
                            'error': `${window.location.origin}/dashboard`,
                            'return': `${window.location.origin}/dashboard`
                          }
                        },
                        callbacks: {
                          onReady: () => {
                            console.log("✅ Status Screen Brick ready (failed payment)");
                            setLoading(false);
                          },
                          onError: (error: any) => {
                            console.error("❌ Status Screen Brick error:", error);
                            // Only show fallback if Status Screen completely fails
                            container.innerHTML = `
                              <div style="text-align: center; padding: 40px 20px; color: #ef4444; font-size: 18px; font-weight: 600;">
                                ❌ ${isPortuguese ? "Pagamento rejeitado" : "Payment rejected"}
                                <div style="font-size: 14px; margin-top: 10px; font-weight: normal;">
                                  ${isPortuguese ? "Motivo:" : "Reason:"} ${reason}
                                </div>
                              </div>
                            `;
                          },
                        },
                      };

                      // Create the Status Screen Brick in the dedicated container
                      window.statusScreenBrickController = await bricksBuilder.create(
                        'statusScreen', 
                        'statusScreenBrick_container', 
                        statusSettings
                      );
                    } catch (statusError) {
                      console.error("❌ Failed to create Status Screen Brick for failed payment:", statusError);
                      // Only show fallback if Status Screen creation completely fails
                      container.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px; color: #ef4444; font-size: 18px; font-weight: 600;">
                          ❌ ${isPortuguese ? "Pagamento rejeitado" : "Payment rejected"}
                          <div style="font-size: 14px; margin-top: 10px; font-weight: normal;">
                            ${isPortuguese ? "Motivo:" : "Reason:"} ${reason}
                          </div>
                        </div>
                      `;
                    }
                  }

                  // ❌ REMOVED: setTimeout onClose() for failures too
                  // Let Dashboard handle all modal state management
                }
              } catch (err) {
                console.error("🚨 Payment request failed:", err);
                setError(isPortuguese ? "Falha no processamento do pagamento." : "Payment processing failed.");
                setLoading(false);
                setPaymentCompleted(false); // Allow retry on network errors
                setBrickCreated(false); // Allow re-creation of brick
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

      // Mark brick as created and reset processing state
      setBrickCreated(true);
      setIsProcessing(false);

    } catch (brickError) {
      console.error("❌ [renderPaymentBrick] Failed to create Payment Brick:", brickError);
      setError(isPortuguese ? "Falha ao criar interface de pagamento." : "Failed to create payment interface.");
      setLoading(false);
    } 
  } finally {
      // ─── Always release the lock ───────────────────────────────────────────
      release();
      console.log("🔓 [renderPaymentBrick] released lock");
    }
  };

  //
  // 4) "Test Payment" button (dev mode)
  //
  const handleTestPayment = () => {
    if (!hedgeData || paymentCompleted) {
      console.log("⚠️ [MercadoPaySDKModal] Test payment blocked - no hedgeData or payment already completed");
      return;
    }

    console.log("🧪 [MercadoPaySDKModal] Processing test payment");
    setPaymentCompleted(true);
    const testToken = paymentTrackingToken || `test_payment_${Date.now()}`;
    onSuccess(hedgeData, testToken);
    toast({
      title: isPortuguese ? "Modo Dev: Proteção registrada" : "Dev mode: Hedge placed",
    });
    onClose();
  };

  // Reset payment state when modal closes
  const handleClose = () => {
    console.log("🔒 [MercadoPaySDKModal] Modal closing, resetting states");

    // Always allow closing and reset states properly
    setPaymentCompleted(false);
    setLoading(true);
    setError(null);
    setOrderId(null);
    setPublicKey(null);

    // Clear any existing payment brick and its controller
    const container = document.getElementById("paymentBrick_container");
    if (container) {
      container.innerHTML = '';
    }

    // Destroy any existing payment brick controller
    if (window.paymentBrickController) {
      try {
        window.paymentBrickController.unmount();
      } catch (e) {
        console.log("Payment brick controller unmount failed:", e);
      }
      window.paymentBrickController = null;
    }

    // Destroy any existing status screen brick controller
    if (window.statusScreenBrickController) {
      try {
        window.statusScreenBrickController.unmount();
      } catch (e) {
        console.log("Status screen brick controller unmount failed:", e);
      }
      window.statusScreenBrickController = null;
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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