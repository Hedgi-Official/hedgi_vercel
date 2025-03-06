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
    mutationFn: async (tradeOrderNumber: number) => {
      const response = await fetch(`/api/hedges/status/${tradeOrderNumber}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      const statusColor = {
        Accepted: 'text-green-600',
        Pending: 'text-yellow-600',
        Rejected: 'text-red-600',
        Error: 'text-red-600',
      }[data.returnData.status] || 'text-muted-foreground';

      toast({
        title: t('Trade Status Details'),
        description: (
          <div className="mt-2 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{t('Order')}:</span>
              <span>#{data.returnData.order}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">{t('Status')}:</span>
              <span className={statusColor}>{data.returnData.status}</span>
            </div>
            {data.returnData.requestStatus !== undefined && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Request Status:</span>
                <span>{getRequestStatusName(data.returnData.requestStatus)}</span>
              </div>
            )}
            {(data.returnData.price !== undefined && data.returnData.price !== null) && (
              <div className="flex justify-between items-center">
                <span className="font-medium">{t('Price')}:</span>
                <span>{data.returnData.price.toFixed(4)}</span>
              </div>
            )}
            {data.returnData.customComment && (
              <div className="flex justify-between items-center">
                <span className="font-medium">{t('Comment')}:</span>
                <span>{data.returnData.customComment}</span>
              </div>
            )}
            {data.returnData.message && (
              <div className="flex justify-between items-center">
                <span className="font-medium">{t('Message')}:</span>
                <span>{data.returnData.message}</span>
              </div>
            )}
            {data.returnData.errorDescr && (
              <div className="flex justify-between items-center text-red-600">
                <span className="font-medium">{t('Error')}:</span>
                <span>{data.returnData.errorDescr}</span>
              </div>
            )}
          </div>
        ),
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
        checkTradeStatusMutation.mutate(data.returnData.order);
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
        const response = await fetch(`/api/xtb/trades/${hedge.tradeOrderNumber}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: `${hedge.targetCurrency}${hedge.baseCurrency}`,
            volume: Math.abs(Number(hedge.amount)) / 100000, // Convert to lots
            tradeDirection: Number(hedge.amount) > 0 ? 'buy' : 'sell'
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        console.log('[Dashboard] Trade close response:', data);

        if (!data.status || !data.returnData?.order) {
          throw new Error('Failed to close trade');
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
                              onClick={() => checkTradeStatusMutation.mutate(hedge.tradeOrderNumber!)}
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