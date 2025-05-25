import * as React from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const { data: trades } = useQuery<Trade[]>({
    queryKey: ['/trades'],
    queryFn: () => fetch(`/trades`, { credentials: 'include' }).then(r => r.json()),
  });

  const checkTradeStatusMutation = useMutation({
    mutationFn: async (tradeOrderNumber: string) => {
      const response = await fetch(`/trades/status/${tradeOrderNumber}`, {
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
    Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">
  >({
    mutationFn: async (h) => {
      // h is now the exact object your simulator gives you

      // parse numeric amount & derive direction
      const amountNum = parseFloat(h.amount);
      const volume    = Math.abs(amountNum) / 100000;
      const direction = amountNum > 0 ? 'buy' : 'sell';
      const symbol    = `${h.targetCurrency}${h.baseCurrency}`;

      // build the metadata you want to send
      const metadata = {
        days:      h.duration,
        deviation: 5,
        magic:     123456,
        comment:   'Hedgi test trade'
      };

      // only these fields go on the wire
      const payload = { symbol, direction, volume, metadata };
      const API_BASE = import.meta.env.VITE_API_BASE || "";
      console.log('[Dashboard] sending payload:', payload);
      console.log('[Dashboard] sending to URL:', `${API_BASE}/trades`);
      console.log('[Dashboard] payload JSON:', JSON.stringify(payload));
      const res = await fetch(`${API_BASE}/trades`, {
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
      queryClient.invalidateQueries({ queryKey: ['/trades'] });
      toast({ title: t('Trade Created'), description: `#${data.id}` });
      checkTradeStatusMutation.mutate(data.id.toString());
    },
    onError(err) {
      toast({ variant: 'destructive', title: t('Error'), description: err.message });
    }
  });

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
      
      const response = await fetch(`/trades/${position}/close`, {
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
      const response = await fetch(`/trades/${hedge.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/trades"] });
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
              {trades?.length === 0 ? (
                <p>{t('No active trades')}</p>
              ) : (
                trades?.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-4 border rounded flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{trade.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {trade.direction} {trade.volume}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => checkTradeStatusMutation.mutate(String(trade.id))}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => initiateHedgeClose(trade as unknown as Hedge)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>{t('New Hedge')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencySimulator
                showGraph={false}
                onPlaceHedge={(d) => {
                  console.log('[Dashboard] onPlaceHedge got:', d);
                  createHedgeMutation.mutate(d);
                }}
                onOrdersUpdated={() => queryClient.invalidateQueries({ queryKey: ['/trades'] })}
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
            <AlertDialogTitle>Position Not Found</AlertDialogTitle>
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
    </div>
  );
}