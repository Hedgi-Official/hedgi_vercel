import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useTranslation } from 'react-i18next';
import { Header } from "@/components/header";
import { ExchangeRatesWidget } from "@/components/exchange-rates-widget";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hedge } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hedges } = useQuery<Hedge[]>({
    queryKey: ["/api/hedges"],
  });

  const checkTradeStatusMutation = useMutation({
    mutationFn: async (tradeOrderNumber: string) => {
      // CRITICAL FIX: Always ensure the tradeOrderNumber is a string
      // This avoids type conversion issues when fetching from the API
      const orderNumberStr = String(tradeOrderNumber);
      console.log(`[Dashboard] Checking status of trade order number: ${orderNumberStr}`);
      
      const response = await fetch(`/api/hedges/status/${orderNumberStr}`, {
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
      console.log(`[Dashboard] Trade status check result:`, data);
      
      // CRITICAL FIX: Make sure we're displaying tradeOrderNumber consistently
      const displayNumber = String(tradeOrderNumber);
      
      toast({
        title: t('Trade Status'),
        description: data.message || (data.found 
          ? `Trade #${displayNumber} exists in system` 
          : `Trade #${displayNumber} not found`),
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

  const deleteHedgeMutation = useMutation({
    mutationFn: async (hedge: Hedge) => {
      console.log('[Dashboard] Attempting to close hedge:', hedge);

      // First close the trade if it exists
      if (hedge.tradeOrderNumber) {
        try {
          // Use the new broker-based API endpoint for closing trades
          console.log(`[Dashboard] Closing trade with order number ${hedge.tradeOrderNumber}`);
          
          // CRITICAL FIX: Ensure hedge.tradeOrderNumber is valid before trying to convert
          // This avoids issues with null/undefined values trying to be parsed as numbers
          const tradeOrderNumber = hedge.tradeOrderNumber ? Number(hedge.tradeOrderNumber) : null;
          
          if (!tradeOrderNumber) {
            console.error('[Dashboard] Invalid trade order number:', hedge.tradeOrderNumber);
            throw new Error('Invalid trade order number');
          }
          
          console.log(`[Dashboard] Parsed trade order number as: ${tradeOrderNumber}`);
          
          const response = await fetch(`/api/trades/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              broker: 'tickmill', // Use tickmill as the default broker
              position: tradeOrderNumber // Already converted to number above
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
          
          // Position not found is a special case we handle gracefully
          if (data && data.returnData && data.returnData.error && 
              data.returnData.error.includes('not found')) {
            console.warn(`[Dashboard] Position ${hedge.tradeOrderNumber} not found at broker.`);
            // Not throwing an error here since we'll still delete from the database
            toast({
              title: "Trade Position Not Found",
              description: "The trade couldn't be found at the broker, but we'll remove it from your dashboard.",
              variant: "default"
            });
          } else if (data && data.message === "Market closed") {
            console.warn(`[Dashboard] Market is closed, can't close trade ${hedge.tradeOrderNumber}`);
            toast({
              title: "Market Currently Closed",
              description: "The market is currently closed. The hedge will be deleted from your dashboard.",
              variant: "default"
            });
          } else {
            console.log(`[Dashboard] Successfully closed trade ${hedge.tradeOrderNumber}`);
            toast({
              title: "Trade Closed",
              description: "Your hedge position has been successfully closed.",
              variant: "default"
            });
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
        }
      }

      // Then delete the hedge from our database
      const response = await fetch(`/api/hedges/${hedge.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
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
                            onClick={() => deleteHedgeMutation.mutate(hedge)}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}