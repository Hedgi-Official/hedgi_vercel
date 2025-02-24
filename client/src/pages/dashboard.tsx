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
import { X } from "lucide-react";
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

  const createHedgeMutation = useMutation({
    mutationFn: async (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => {
      const response = await fetch('/api/hedges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hedgeData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
      toast({
        title: t('simulator.notifications.hedgeCreated'),
        description: t('simulator.notifications.hedgeCreatedDesc'),
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

  const deleteHedgeMutation = useMutation({
    mutationFn: async (hedgeId: number) => {
      const response = await fetch(`/api/hedges/${hedgeId}`, {
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
                  {hedges?.map((hedge) => (
                    <div
                      key={hedge.id}
                      className="p-4 border rounded flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">
                          {t(`simulator.hedgeTitles.${hedge.tradeDirection === 'buy' ? 'bought' : 'sold'}`)} {hedge.targetCurrency}{hedge.baseCurrency}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('simulator.amount')}: {Number(hedge.amount).toLocaleString('en-US', {
                            style: 'decimal',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          {' '}{hedge.baseCurrency}
                          • {t('simulator.rate')}: {Number(hedge.rate).toFixed(4)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{t(`simulator.status.${hedge.status}`)}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90"
                          onClick={() => deleteHedgeMutation.mutate(hedge.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
                showGraph={true} 
                onPlaceHedge={(hedgeData) => createHedgeMutation.mutate(hedgeData)}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}