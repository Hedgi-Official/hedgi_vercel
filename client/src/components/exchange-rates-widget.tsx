import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useActivTradesRate } from "@/hooks/use-activtrades-rate";
import { useTickmillRate } from "@/hooks/use-tickmill-rate";

const CURRENCY_PAIRS = [
  { value: "USDBRL", label: "USDBRL" },
  { value: "EURUSD", label: "EURUSD" },
  { value: "USDMXN", label: "USDMXN" }
];

export function ExchangeRatesWidget() {
  const { t } = useTranslation();
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  
  // Fetch rates from the two brokers
  const { 
    data: activTradesRate, 
    isLoading: isLoadingActivTrades, 
    error: activTradesError 
  } = useActivTradesRate(selectedPair);
  
  const { 
    data: tickmillRate, 
    isLoading: isLoadingTickmill, 
    error: tickmillError 
  } = useTickmillRate(selectedPair);

  const renderActivTradesRate = () => {
    if (activTradesError) {
      return <div className="text-destructive">Error loading ActivTrades rate: {activTradesError.message}</div>;
    }

    return (
      <div className="space-y-2 p-4 rounded-lg border">
        <div className="text-sm text-muted-foreground">ActivTrades Rate</div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {activTradesRate ? activTradesRate.bid.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Bid Price')}</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {activTradesRate ? activTradesRate.ask.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Ask Price')}</div>
        </div>
      </div>
    );
  };

  const renderTickmillRate = () => {
    if (tickmillError) {
      return <div className="text-destructive">Error loading Tickmill rate: {tickmillError.message}</div>;
    }

    return (
      <div className="space-y-2 p-4 rounded-lg border">
        <div className="text-sm text-muted-foreground">Tickmill Rate</div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {tickmillRate ? tickmillRate.bid.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Bid Price')}</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {tickmillRate ? tickmillRate.ask.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Ask Price')}</div>
        </div>
      </div>
    );
  };

  const isLoading = isLoadingActivTrades || isLoadingTickmill;
  const hasError = activTradesError || tickmillError;

  return (
    <Card className="bg-background shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {t('Live Exchange Rates')}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
        {hasError && !activTradesRate && !tickmillRate ? (
          <div className="text-destructive">
            Error loading rates. Please try again later.
          </div>
        ) : isLoading && !activTradesRate && !tickmillRate ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              {renderActivTradesRate()}
              {renderTickmillRate()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}