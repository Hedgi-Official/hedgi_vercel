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

export default function Dashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [hedgeToDelete, setHedgeToDelete] = React.useState<Hedge | null>(null);
  const [confirmMessage, setConfirmMessage] = React.useState<string>("");

  // Track hedge IDs that are in the process of being deleted
  const [hedgesBeingDeleted, setHedgesBeingDeleted] = React.useState<Set<number>>(new Set());

  // Get hedges and filter out any that are marked for deletion
  const { data: allHedges } = useQuery<Hedge[]>({
    queryKey: ["/api/hedges"],
  });
  
  // Filter out any hedges that are marked for deletion
  const hedges = React.useMemo(() => {
    if (!allHedges) return [];
    return allHedges.filter(hedge => !hedgesBeingDeleted.has(hedge.id));
  }, [allHedges, hedgesBeingDeleted]);

  const checkTradeStatusMutation = useMutation({
    mutationFn: async (tradeOrderNumber: string) => {
      const response = await fetch(`/api/hedges/status/${tradeOrderNumber}`, {
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

  const createHedgeMutation = useMutation({
    mutationFn: async (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => {
      console.log('[Dashboard] Creating hedge with data:', hedgeData);

      try {
        // Ensure all data is properly formatted for the server
        const formattedData = {
          ...hedgeData,
          amount: String(hedgeData.amount), // Ensure amount is a string
          rate: String(hedgeData.rate),    // Ensure rate is a string
          duration: Number(hedgeData.duration) // Ensure duration is a number
        };
        
        console.log('[Dashboard] Sending formatted hedge data:', formattedData);

        const response = await fetch('/api/hedges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedData),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Dashboard] Server error response:', errorText);
          throw new Error(errorText || 'Failed to create hedge');
        }

        const data = await response.json();
        console.log('[Dashboard] Server response:', data);
        
        // Return the entire response to handle in onSuccess
        return data;
      } catch (error) {
        console.error('[Dashboard] Error in mutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[Dashboard] Hedge created successfully:', data);
      
      // Always invalidate the hedges query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
      
      toast({
        title: t('simulator.notifications.hedgeCreated'),
        description: t('simulator.notifications.hedgeCreatedDesc'),
      });

      // Check if we have a valid trade order number in the response
      if (data.returnData?.order) {
        console.log('[Dashboard] Trade created with order number:', data.returnData.order);
        // Convert to string to ensure compatibility with our updated mutate function
        checkTradeStatusMutation.mutate(String(data.returnData.order));
      } else {
        console.warn('[Dashboard] Missing order number in response:', data);
      }
    },
    onError: (error) => {
      console.error('[Dashboard] Hedge creation error:', error);
      
      toast({
        variant: "destructive",
        title: t('simulator.notifications.error'),
        description: error instanceof Error ? error.message : 'Failed to create hedge',
      });
    }
  });

  // Handle initiating the hedge close process
  const initiateHedgeClose = async (hedge: Hedge) => {
    console.log('[Dashboard] Initiating hedge close process for:', hedge);
    
    // Mark this hedge as being deleted to immediately remove from UI
    setHedgesBeingDeleted(prev => {
      const newSet = new Set(prev);
      newSet.add(hedge.id);
      return newSet;
    });
    
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
      
      const response = await fetch(`/api/trades/close`, {
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
        
        // Optimistically update the UI by invalidating the hedges query
        // This will remove the hedge from the active hedges table immediately
        queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
        
        // Show confirmation dialog instead of auto-deleting
        setHedgeToDelete(hedge);
        setConfirmDialogOpen(true);
        return; // Stop here and wait for user confirmation
      } else if (data && data.message === "Market closed") {
        console.warn(`[Dashboard] Market is closed, can't close trade ${position}`);
        
        // Optimistically update the UI by invalidating the hedges query
        // This will remove the hedge from the active hedges table immediately
        queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
        
        toast({
          title: "Market Currently Closed",
          description: "The market is currently closed. The hedge will be deleted from your dashboard.",
          variant: "default"
        });
        // Continue with database deletion
        deleteHedgeMutation.mutate(hedge);
      } else {
        console.log(`[Dashboard] Successfully closed trade with broker: ${broker}, position: ${position}`);
        
        // Optimistically update the UI by invalidating the hedges query
        // This will remove the hedge from the active hedges table immediately
        queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
        
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
      
      // Optimistically update the UI by invalidating the hedges query
      // This will remove the hedge from the active hedges table immediately
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
      
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
  // Force delete the hedge with confirmation
  const confirmHedgeDeletion = () => {
    if (hedgeToDelete) {
      console.log('[Dashboard] Force deleting hedge after confirmation:', hedgeToDelete);
      
      // Close the dialog immediately to prevent seeing error toasts
      setConfirmDialogOpen(false);
      
      // Optimistically update the UI by invalidating the hedges query
      // This will remove the hedge from the active hedges table immediately
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
      
      // Show a success toast immediately - user confirmed they want to delete
      toast({
        title: t('simulator.notifications.hedgeDeleted'),
        description: t('simulator.notifications.hedgeDeletedDesc'),
      });
      
      // Then perform the actual deletion in the background
      forceDeleteHedgeMutation.mutate(hedgeToDelete, {
        // Don't show any UI notifications on success/error since we already 
        // showed the success message and don't want to show error messages
        onSuccess: () => {
          // Just invalidate the queries silently
          queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
        },
        onError: (error) => {
          // Log error but don't show to user - they already confirmed deletion
          console.error('[Dashboard] Error in force delete after confirmation:', error);
        }
      });
      
      setHedgeToDelete(null);
      setConfirmMessage('');
    } else {
      setConfirmDialogOpen(false);
    }
  };
  
  // Cancel deletion of a hedge
  const cancelHedgeDeletion = () => {
    // Remove the hedge from the being deleted set so it reappears in UI
    if (hedgeToDelete) {
      setHedgesBeingDeleted(prev => {
        const newSet = new Set(prev);
        newSet.delete(hedgeToDelete.id);
        return newSet;
      });
    }
    
    setHedgeToDelete(null);
    setConfirmMessage('');
    setConfirmDialogOpen(false);
    
    // Refresh the hedges list
    queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
  };

  // Force delete mutation that adds the force=true parameter and doesn't show toasts by default
  const forceDeleteHedgeMutation = useMutation<
    any,    // Return type
    Error,  // Error type  
    Hedge   // Variables type
  >({
    mutationFn: async (hedge: Hedge) => {
      console.log('[Dashboard] Force deleting hedge from database:', hedge);

      // Ensure hedge is marked as being deleted in UI
      setHedgesBeingDeleted(prev => {
        const newSet = new Set(prev);
        newSet.add(hedge.id);
        return newSet;
      });

      // Add force=true parameter to the request to bypass trade existence checks
      const response = await fetch(`/api/hedges/${hedge.id}?force=true`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Dashboard] Force delete error response:', errorText);
        throw new Error(errorText || 'Failed to delete hedge');
      }
      
      return await response.json();
    },
    onSuccess: (_data, hedge) => {
      // Remove from being deleted set on success (complete cleanup)
      setHedgesBeingDeleted(prev => {
        const newSet = new Set(prev);
        newSet.delete(hedge.id);
        return newSet;
      });
    },
    onError: (_error, hedge) => {
      // On error, we don't remove from being deleted since we've shown the success message already
      // and we don't want the item to reappear in the UI
      console.error(`[Dashboard] Error in force delete, but won't show to user for hedge ID: ${hedge?.id}`);
    }
  });

  // Normal delete mutation that handles confirmations if needed
  const deleteHedgeMutation = useMutation<
    { data: any; hedge: Hedge }, // Return type
    Error,                       // Error type  
    Hedge                        // Variables type
  >({
    mutationFn: async (hedge: Hedge) => {
      console.log('[Dashboard] Deleting hedge from database:', hedge);

      // Delete the hedge from our database
      const response = await fetch(`/api/hedges/${hedge.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      // Check if the response is ok before parsing
      if (!response.ok && response.status !== 200) {
        const errorText = await response.text();
        console.error('[Dashboard] Delete error response:', errorText);
        throw new Error(errorText || 'Failed to delete hedge');
      }
      
      // Parse response to check for confirmation needed
      const data = await response.json();
      console.log('[Dashboard] Delete response:', data);
      
      // Return the data along with the hedge object for handling in onSuccess/onError
      return { data, hedge };
    },
    onSuccess: (result) => {
      const { data, hedge } = result;
      
      // Check if the API returned a confirmation request
      if (data.needsConfirmation) {
        console.log('[Dashboard] Delete requires confirmation:', data.confirmationMessage);
        
        // Ensure hedge is in the hedgesBeingDeleted set to remove it from UI
        setHedgesBeingDeleted(prev => {
          const newSet = new Set(prev);
          newSet.add(hedge.id);
          return newSet;
        });
        
        // Optimistically update the UI by invalidating the hedges query
        queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
        
        // Show confirmation dialog with the API-provided message
        setHedgeToDelete(hedge);
        setConfirmMessage(data.confirmationMessage);
        setConfirmDialogOpen(true);
        return;
      }
      
      // Normal success case - remove from being deleted set
      setHedgesBeingDeleted(prev => {
        const newSet = new Set(prev);
        newSet.delete(hedge.id);
        return newSet;
      });
      
      // Still invalidate the queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
      
      toast({
        title: t('simulator.notifications.hedgeDeleted'),
        description: t('simulator.notifications.hedgeDeletedDesc'),
      });
    },
    onError: (error, hedge) => {
      // On error, remove from being deleted set so it reappears in UI if needed
      if (hedge) {
        setHedgesBeingDeleted(prev => {
          const newSet = new Set(prev);
          newSet.delete(hedge.id);
          return newSet;
        });
      }
      
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
              <CardTitle>{t('Active Hedges')}</CardTitle>
            </CardHeader>
            <CardContent>
              {hedges?.length === 0 ? (
                <p>{t('No active hedges')}</p>
              ) : (
                <div className="space-y-4">
                  {hedges?.map((hedge) => {
                    const amount = Number(hedge.amount);
                    const rate = Number(hedge.rate);
                    const isBuy = amount > 0;

                    return (
                      <div
                        key={hedge.id}
                        className="p-4 border rounded flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">
                            {t(`simulator.hedgeTitles.${isBuy ? 'bought' : 'sold'}`)} {hedge.targetCurrency}/{hedge.baseCurrency}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('simulator.amountField')}: {Math.abs(amount).toLocaleString('en-US', {
                              style: 'decimal',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            {' '}{hedge.baseCurrency}
                            • {t('simulator.currentRate')}: {rate.toFixed(4)}
                            {hedge.tradeOrderNumber && (
                              <> • {t('simulator.tradeOrderNumber')}: #{hedge.tradeOrderNumber}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{t(`simulator.status.${hedge.status}`)}</Badge>
                          {hedge.tradeOrderNumber && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => checkTradeStatusMutation.mutate(hedge.tradeOrderNumber!.toString())}
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                            onClick={() => initiateHedgeClose(hedge)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                onPlaceHedge={(hedgeData) => createHedgeMutation.mutate(hedgeData)}
                onOrdersUpdated={() => queryClient.invalidateQueries({ queryKey: ["/api/hedges"] })}
              />
              
              {/* Trade History Component */}
              <TradeHistory />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Dialog for Position Not Found */}
      <AlertDialog 
        open={confirmDialogOpen} 
        onOpenChange={(isOpen) => {
          // If dialog is being closed without explicit button press
          if (!isOpen && confirmDialogOpen) {
            cancelHedgeDeletion(); // Handle cleanup properly
          } else {
            setConfirmDialogOpen(isOpen);
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Trade Action Required')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMessage || 
               "This trade could not be closed through the broker system. It may have been closed elsewhere. Would you like to remove it from your dashboard?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelHedgeDeletion}>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmHedgeDeletion}>
              {t('Yes, close anyway')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}