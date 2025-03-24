import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivTradesRate } from "@/hooks/use-activtrades-rate";
import { useTickmillRate } from "@/hooks/use-tickmill-rate";
import { useFBSRate } from "@/hooks/use-fbs-rate";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExchangeRate } from "@/types/exchange-rate";

const CURRENCY_PAIRS = [
  { value: "USDBRL", label: "USDBRL" },
  { value: "EURUSD", label: "EURUSD" },
  { value: "USDMXN", label: "USDMXN" }
];

export function ExchangeRatesWidget() {
  const { t } = useTranslation();
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  const { data: activtradesRate, isLoading: isLoadingActivTrades, error: activtradesError } = useActivTradesRate(selectedPair);
  const { data: tickmillRate, isLoading: isLoadingTickmill, error: tickmillError } = useTickmillRate(selectedPair);
  const { data: fbsRate, isLoading: isLoadingFBS, error: fbsError } = useFBSRate(selectedPair);

  // Helper function to render a rate card
  const renderRateCard = (
    title: string, 
    rate: { bid: number; ask: number } | undefined, 
    error: Error | null
  ) => {
    if (error) {
      return <div className="text-destructive">Error loading {title}: {error.message}</div>;
    }

    return (
      <div className="space-y-2 p-4 rounded-lg border">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {rate ? rate.bid.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Bid Price')}</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {rate ? rate.ask.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Ask Price')}</div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-background shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {t('Live Exchange Rates')}
            {(isLoadingActivTrades || isLoadingTickmill || isLoadingFBS) && 
              <Loader2 className="h-4 w-4 animate-spin" />
            }
          </div>
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_PAIRS.map(pair => (
                <SelectItem key={pair.value} value={pair.value}>
                  {t(`currencyPairs.${pair.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(isLoadingActivTrades && isLoadingTickmill && isLoadingFBS) ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              {renderRateCard("ActivTrades Rate", activtradesRate, activtradesError)}
              {renderRateCard("Tickmill Rate", tickmillRate, tickmillError)}
              {renderRateCard("FBS Rate", fbsRate, fbsError)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}