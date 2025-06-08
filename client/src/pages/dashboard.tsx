import * as React from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MercadoPagoBrickModal } from "@/components/mercado-pago-brick-modal";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useTranslation } from 'react-i18next';
import { Header } from "@/components/header";
import { ExchangeRatesWidget } from "@/components/exchange-rates-widget";
import { TradeHistory } from "@/components/trade-history";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hedge } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";


// Define the shape your Flask /trades endpoint returns:
type Trade = {
  id: number;
  symbol: string;               // e.g. "USDMXN"
  direction: 'BUY' | 'SELL';
  volume: number;
  status: string;
  metadata?: {
    days: number;
    deviation: number;
    magic: number;
    comment: string;
  };
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [hedgeToDelete, setHedgeToDelete] = React.useState<Hedge | null>(null);

  // State for Mercado Pago Brick modal popup
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [pendingHedgeData, setPendingHedgeData] = React.useState<any>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<string>("0");

  // Fetch active trades with 10-second polling
  const { data: activeTrades = [] } = useQuery<Trade[]>({
    queryKey: ['/api/trades/open'],
    queryFn: async () => {
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';
      console.log('[Dashboard] Fetching active trades from:', `${serverUrl}/api/trades/open`);
      const response = await fetch(`${serverUrl}/api/trades/open`, { credentials: 'include' });
      console.log('[Dashboard] Active trades response status:', response.status);
      if (!response.ok) {
        console.log('[Dashboard] Active trades request failed with status:', response.status);
        return []; // Return empty array on error
      }
      const data = await response.json();
      console.log('[Dashboard] Active trades data received:', data);
      return Array.isArray(data) ? data : []; // Ensure we always return an array
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  // Fetch trade history with 10-second polling
  const { data: trades = [] } = useQuery<Trade[]>({
    queryKey: ['/api/trades/history'],
    queryFn: async () => {
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';
      console.log('[Dashboard] Fetching trade history from:', `${serverUrl}/api/trades/history`);
      const response = await fetch(`${serverUrl}/api/trades/history`, { credentials: 'include' });
      console.log('[Dashboard] Trade history response status:', response.status);
      if (!response.ok) {
        console.log('[Dashboard] Trade history request failed with status:', response.status);
        return []; // Return empty array on error
      }
      const data = await response.json();
      console.log('[Dashboard] Trade history data received:', data);
      return Array.isArray(data) ? data : []; // Ensure we always return an array
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  const checkTradeStatusMutation = useMutation({
    mutationFn: async (tradeOrderNumber: string) => {
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';
      const response = await fetch(`${serverUrl}/api/trades/${tradeOrderNumber}/status`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data, tradeOrderNumber) => {
      // For the new API implementation, we have a different response format
      // The hedge status endpoint simply returns if the order exists in our database

      toast({
        title: t('Trade Status'),
        description: data.message || (data.found 
          ? `Trade #${tradeOrderNumber} exists in system` 
          : `Trade #${tradeOrderNumber} not found`),
        duration: 10000,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t('simulator.notifications.error'),
        description: error.message,
      });
    }
  });

  const createHedgeMutation = useMutation<
    Trade, 
    Error, 
    { hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">, paymentToken?: string }
  >({
    mutationFn: async ({ hedgeData: h, paymentToken }) => {
      // h is now the exact object your simulator gives you

      // parse numeric amount & derive direction
      const amountNum = parseFloat(h.amount);
      const volume    = Math.abs(amountNum) / 100000;
      const direction = amountNum > 0 ? 'buy' : 'sell';
      const symbol    = `${h.targetCurrency}${h.baseCurrency}`;

      // Flask expects this exact structure based on working curl example
      const payload = { 
        symbol, 
        direction, 
        volume,
        metadata: {
          days: h.duration,
          margin: h.margin || 500,
          paymentToken: paymentToken || 'DEV_MODE',
          deviation: 5,
          comment: 'Hedgi test trade'
        }
      };

      console.log('[Dashboard] sending payload:', payload);
      console.log('[Dashboard] payment token received:', paymentToken);
      console.log('[Dashboard] payment token in metadata:', payload.metadata.paymentToken);

      // Use direct server URL in development to bypass Vite routing issues
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';
      const fullUrl = `${serverUrl}/api/trades`;

      console.log('[Dashboard] sending to URL:', fullUrl);
      console.log('[Dashboard] payload JSON:', JSON.stringify(payload));
      const res = await fetch(fullUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('[Dashboard] Response status:', res.status);
      console.log('[Dashboard] Response headers:', Object.fromEntries(res.headers.entries()));
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create trade');
      }
      return res.json() as Promise<Trade>;
    },
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/history'] });
      toast({ title: t('Trade Created'), description: `#${data.id}` });
      checkTradeStatusMutation.mutate(data.id.toString());
    },
    onError(err) {
      toast({ variant: 'destructive', title: t('Error'), description: err.message });
    }
  });

  // Legacy function - no longer used with Mercado Pago Brick integration
  const handlePlaceHedge = async (
    hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">,
    paymentToken?: string
  ) => {
    console.log('[Dashboard] handlePlaceHedge called with paymentToken:', paymentToken);

    // First check if payments are enabled in the system
    try {
      const paymentStatusResponse = await fetch('/api/payment/status');
      const paymentStatus = await paymentStatusResponse.json();

      if (!paymentStatus.enabled) {
        console.log('[Dashboard] Payments disabled - proceeding directly with trade creation');
        // If payments are disabled, proceed directly without payment validation
        return createHedgeMutation.mutate({ hedgeData, paymentToken: 'disabled' });
      }

      // Check if we have any payment token
      console.log('[Dashboard] Payment token type:', typeof paymentToken);
      console.log('[Dashboard] Payment token value:', paymentToken);

      if (!paymentToken || paymentToken === 'undefined' || paymentToken === 'null' || paymentToken === '') {
        toast({
          variant: "destructive",
          title: "Payment Required",
          description: "Please complete the payment process before placing the hedge.",
        });
        return;
      }

      // For test payments, proceed directly
      if (paymentToken === 'test-payment-success' || 
          paymentToken.startsWith('test_payment_') || 
          paymentToken.startsWith('test_mp_')) {
        console.log('[Dashboard] Test payment token detected, proceeding with trade creation');
        return createHedgeMutation.mutate({ hedgeData, paymentToken });
      }

      // For real payments, verify with Mercado Pago before proceeding
      console.log('[Dashboard] Verifying real payment with token:', paymentToken);

      const verificationResponse = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentToken,
          currency: hedgeData.baseCurrency
        })
      });

      console.log('[Dashboard] Payment verification response status:', verificationResponse.status);

      if (!verificationResponse.ok) {
        let errorMessage = 'Payment verification failed';
        try {
          const errorData = await verificationResponse.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('[Dashboard] Payment verification failed with data:', errorData);
        } catch {
          const errorText = await verificationResponse.text();
          console.error('[Dashboard] Payment verification failed with text:', errorText);
          errorMessage = errorText || errorMessage;
        }

        toast({
          variant: "destructive",
          title: "Payment Verification Failed",
          description: errorMessage,
        });
        return;
      }

      let verificationResult;
      try {
        verificationResult = await verificationResponse.json();
      } catch (parseError) {
        console.error('[Dashboard] Failed to parse verification response:', parseError);
        toast({
          variant: "destructive",
          title: "Payment Verification Error",
          description: "Invalid response from payment service. Please try again.",
        });
        return;
      }

      console.log('[Dashboard] Payment verification result:', verificationResult);

      // Check HTTP status first
      if (!verificationResponse.ok) {
        console.error('[Dashboard] Payment verification HTTP error:', verificationResponse.status, verificationResult);

        let errorMessage = "Payment verification failed.";
        if (verificationResult.error) {
          errorMessage = verificationResult.error;
        } else if (verificationResponse.status === 404) {
          errorMessage = "Payment not found. The payment ID may be invalid.";
        } else if (verificationResponse.status === 500) {
          errorMessage = "Payment service error. Please try again.";
        }

        toast({
          variant: "destructive",
          title: "Payment Verification Failed",
          description: errorMessage,
        });
        return;
      }

      // Check if verification result indicates success - handle both direct status and nested response status
      const verificationStatus = verificationResult.status || verificationResult.response?.status;
      const isApproved = verificationStatus === 'approved';

      console.log('[Dashboard] Payment verification status check:', {
        verificationStatus,
        isApproved,
        fullResult: verificationResult
      });

      if (!isApproved) {
        console.error('[Dashboard] Payment not approved:', verificationResult);

        let errorMessage = `Payment not approved. Status: ${verificationStatus || 'unknown'}`;
        const statusDetail = verificationResult.statusDetail || verificationResult.status_detail || verificationResult.response?.status_detail;
        if (statusDetail) {
          errorMessage += ` (${statusDetail})`;
        }

        toast({
          variant: "destructive",
          title: "Payment Not Approved",
          description: errorMessage,
        });
        return;
      }

      // Only proceed if payment is explicitly verified and approved
      console.log('[Dashboard] Payment verified successfully, proceeding with trade creation');
      
      // Payment now handled by Mercado Pago Brick pages
      
      return createHedgeMutation.mutate({ hedgeData, paymentToken });
    } catch (error) {
      console.error('[Dashboard] Payment verification error:', error);
      
      // Legacy modal code removed - now using Mercado Pago Brick pages
      
      toast({
        variant: "destructive",
        title: "Payment Verification Error",
        description: "Unable to verify payment status. Please try again.",
      });
    }
  };

  // 3) Close trade
  const initiateHedgeClose = async (hedge: Hedge) => {
    console.log('[Dashboard] Initiating hedge close process for:', hedge);

    // If there's no trade order number, just delete the hedge directly
    if (!hedge.tradeOrderNumber) {
      deleteHedgeMutation.mutate(hedge);
      return;
    }

    // Extract broker and magic from the hedge data
    // Default to 'tickmill' if no broker is specified in the hedge
    const broker = hedge.broker || 'tickmill';
    // Use the stored tradeOrderNumber as the position to close
    const position = Number(hedge.tradeOrderNumber);

    try {
      // Use the broker-based API endpoint for closing trades
      console.log(`[Dashboard] Closing trade with broker: ${broker}, position: ${position}`);

      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';
      const response = await fetch(`${serverUrl}/api/trades/${position}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker: broker,
          position: position,
          comment: "Hedgi close position" // Add comment for tracking
        }),
        credentials: 'include'
      });

      // Enhanced error handling - handle both HTTP and API errors
      const responseText = await response.text();
      let data;

      try {
        // Attempt to parse as JSON
        data = JSON.parse(responseText);
        console.log('[Dashboard] Trade close response:', data);
      } catch (parseError) {
        console.error('[Dashboard] Failed to parse response as JSON:', responseText);
        // Try to determine if this is an HTML response (typically an error page)
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
          console.error('[Dashboard] Received HTML error page instead of JSON');
          throw new Error('Received HTML response instead of JSON. The server may be down or experiencing issues.');
        } else {
          throw new Error(`Invalid response format: ${responseText.substring(0, 100)}...`);
        }
      }

      // HTTP status wasn't OK
      if (!response.ok) {
        console.error('[Dashboard] Error closing trade:', data);
        throw new Error(data.error || data.message || 'Failed to close trade');
      }

      // API status wasn't successful
      if (data && data.status === false) {
        console.error('[Dashboard] API error closing trade:', data);
        throw new Error(data.error || data.message || 'Failed to close trade');
      }

      // Position not found is a special case that requires confirmation
      if (data && data.returnData && data.returnData.error && 
          data.returnData.error.includes('not found')) {
        console.warn(`[Dashboard] Position ${position} not found at broker ${broker}.`);

        // Show confirmation dialog instead of auto-deleting
        setHedgeToDelete(hedge);
        setConfirmDialogOpen(true);
        return; // Stop here and wait for user confirmation
      } else if (data && data.message === "Market closed") {
        console.warn(`[Dashboard] Market is closed, can't close trade ${position}`);
        toast({
          title: "Market Currently Closed",
          description: "The market is currently closed. The hedge will be deleted from your dashboard.",
          variant: "default"
        });
        // Continue with database deletion
        deleteHedgeMutation.mutate(hedge);
      } else {
        console.log(`[Dashboard] Successfully closed trade with broker: ${broker}, position: ${position}`);
        toast({
          title: "Trade Closed",
          description: "Your hedge position has been successfully closed.",
          variant: "default"
        });
        // Continue with database deletion
        deleteHedgeMutation.mutate(hedge);
      }
    } catch (closeError) {
      console.error(`[Dashboard] Error closing trade:`, closeError);
      // Even if trade close fails, we still want to try to delete the hedge from database
      console.log(`[Dashboard] Will continue with database deletion despite close error`);
      toast({
        variant: "destructive",
        title: t('Trade Closure Warning'),
        description: 'Could not close trade at broker, but will remove from database. The trade may still be active at the broker.',
      });
      // Continue with database deletion
      deleteHedgeMutation.mutate(hedge);
    }
  };

  // Confirm deletion of a hedge that wasn't found on the broker
  const confirmHedgeDeletion = () => {
    if (hedgeToDelete) {
      deleteHedgeMutation.mutate(hedgeToDelete);
      setHedgeToDelete(null);
    }
    setConfirmDialogOpen(false);
  };

  // Cancel deletion of a hedge
  const cancelHedgeDeletion = () => {
    setHedgeToDelete(null);
    setConfirmDialogOpen(false);
  };

  const deleteHedgeMutation = useMutation({
    mutationFn: async (hedge: Hedge) => {
      console.log('[Dashboard] Deleting hedge from database:', hedge);

      // Delete the hedge from our database
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';
      const response = await fetch(`${serverUrl}/api/trades/${hedge.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades/history"] });
      toast({
        title: t('simulator.notifications.hedgeDeleted'),
        description: t('simulator.notifications.hedgeDeletedDesc'),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Convert request status code to description based on XTB API docs
  const getRequestStatusName = (status: number) => {
    switch(status) {
      case 0:
        return 'ERROR - error';
      case 1:
        return 'PENDING - pending';
      case 3:
        return 'ACCEPTED - The transaction has been executed successfully';
      case 4:
        return 'REJECTED - The transaction has been rejected';
      default:
        return `Unknown (${status})`;
    }
  };

  // TradeItem component - simplified without individual status queries
  const TradeItem = ({ trade, onClose }: { trade: any, onClose: (flaskTradeId: number | null, dbTradeId: number) => void }) => {
    // Use the status from the main trades query (which already fetches from Flask)
    const displayStatus = trade.status || 'open';

    // Hide only CLOSED and FAILED trades from active section
    const isCompleted = ['FAILED', 'CLOSED', 'failed', 'closed'].includes(displayStatus.toUpperCase());

    if (isCompleted) {
      return null; // Don't render completed trades in active section
    }

    return (
      <div className="p-4 border rounded flex justify-between items-center">
        <div>
          <p className="font-medium">{trade.symbol} (ID: {trade.broker === 'flask' ? trade.flaskTradeId : trade.id})</p>
          <p className="text-sm text-muted-foreground">
            {trade.direction} {(() => {
              // Convert volume back to amount and format with base currency
              const volume = parseFloat(trade.volume) || 0.01;
              const amount = volume * 100000; // Convert back to original amount

              // Extract base currency from symbol (e.g., USDBRL -> USD, EURUSD -> EUR)
              const baseCurrency = trade.symbol ? trade.symbol.substring(0, 3) : 'USD';

              // Get currency symbol
              const currencySymbol = baseCurrency === 'USD' ? '$' : 
                                   baseCurrency === 'EUR' ? '€' : 
                                   baseCurrency === 'GBP' ? '£' : '';

              return `${currencySymbol}${amount.toLocaleString('en-US')} ${baseCurrency}`;
            })()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Status: {displayStatus}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/90"
            onClick={() => {
              onClose(
                trade.broker === 'flask' ? trade.flaskTradeId : null,
                trade.id
              );
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Close Flask trade using the Flask trade ID
  const closeFlaskTrade = async (flaskTradeId: number, dbTradeId: number) => {
    try {
      console.log('[Dashboard] Closing Flask trade ID:', flaskTradeId);

      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : '';

      const response = await fetch(`${serverUrl}/api/trades/${flaskTradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Dashboard] Flask close error:', errorText);
        throw new Error(`Failed to close Flask trade: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Dashboard] Flask trade closed successfully:', result);

      toast({
        title: "Trade Closed",
        description: "Your Flask trade has been successfully closed.",
      });

      // Refresh the trades list
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades/history"] });

    } catch (error) {
      console.error('[Dashboard] Error closing Flask trade:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to close trade: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header username={user?.username} onLogout={handleLogout} />

      <main className="container mx-auto py-8 relative z-10">
        <div className="grid gap-8">
          {/* Live Exchange Rates Widget */}
          <ExchangeRatesWidget />

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>{t('Active Trades')}</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                if (activeTrades.length === 0) {
                  return <p>{t('No active trades')}</p>;
                }

                return activeTrades.map((trade) => {
                  return (
                    <TradeItem 
                      key={trade.id} 
                      trade={trade} 
                      onClose={(flaskTradeId, dbTradeId) => {
                        if (flaskTradeId) {
                          closeFlaskTrade(flaskTradeId, dbTradeId);
                        } else {
                          initiateHedgeClose(trade as unknown as Hedge);
                        }
                      }}
                    />
                  );
                });
              })()}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>{t('New Hedge')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencySimulator
                showGraph={false}
                onPlaceHedge={(hedgePayload) => { 
                  console.log("📝 [Dashboard] CurrencySimulator onPlaceHedge called with:", hedgePayload);
                  
                  // Calculate payment amount using actual hedge costs and margin
                  const margin = hedgePayload.margin ? Number(hedgePayload.margin) : 0;
                  const hedgeCost = hedgePayload.cost ? Number(hedgePayload.cost) : 0;
                  const paymentAmount = Number((margin + hedgeCost).toFixed(2));
                  
                  console.log("💰 [Dashboard] Payment calculation:");
                  console.log("- Margin:", margin);
                  console.log("- Hedge cost:", hedgeCost);
                  console.log("- Total payment amount:", paymentAmount);
                  
                  console.log("✅ [Dashboard] Opening Mercado Pago Brick modal popup");
                  console.log("Payment amount:", paymentAmount);
                  
                  // Set data and open modal popup
                  setPaymentAmount(paymentAmount.toString());
                  setPendingHedgeData(hedgePayload);
                  setShowPaymentModal(true);
                  
                  // Return a resolved promise immediately to prevent infinite loading
                  return Promise.resolve({
                    ask: 0,
                    bid: 0,
                    comment: "Payment modal opened",
                    deal: 0,
                    order: 0,
                    price: 0,
                    request: {},
                    request_id: 0,
                    retcode: 0,
                    retcode_external: 0,
                    volume: 0
                  });
                }}
                onOrdersUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/trades/history'] });
                }}
              />
              {/* Trade History Component */}
              <TradeHistory />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Dialog for Position Not Found */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogDescription>
              The trade position couldn't be found at the broker.
              This could be because it was closed elsewhere or never existed.
              Would you like to remove it from your dashboard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelHedgeDeletion}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmHedgeDeletion}>
              Yes, remove it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>      

      {showPaymentModal && pendingHedgeData && (
        <MercadoPagoBrickModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingHedgeData(null);
          }}
          onPaymentSuccess={async (paymentResult) => {
            console.log('[Dashboard] Payment successful (Brick):', paymentResult);

            // 1) Show a toast/banner right away
            toast({
              title: "Success",
              description: "Payment processed and hedge placed successfully!",
            });

            // 2) Immediately place the hedge on your server
            try {
              const response = await fetch('/api/trades', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  hedgeData: pendingHedgeData,
                  paymentToken: paymentResult.id   // this ID is the refund token from Flask
                }),
              });

              if (!response.ok) {
                throw new Error(await response.text());
              }

              // 3) Refresh trade lists
              queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
              queryClient.invalidateQueries({ queryKey: ['/api/trades/history'] });
            } catch (err: any) {
              console.error('[Dashboard] Hedge placement after payment error:', err);
              toast({
                variant: "destructive",
                title: "Trade Error",
                description: "Payment succeeded but failed to place hedge. Please contact support.",
              });
            }

            // 4) Clean up local state
            setShowPaymentModal(false);
            setPendingHedgeData(null);
          }}
          amount={paymentAmount}
          hedgeData={pendingHedgeData}
        />
      )}

      
    </div>
  );
}