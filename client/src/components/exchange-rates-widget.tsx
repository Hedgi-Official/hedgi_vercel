import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useXTB } from "@/hooks/use-xtb";
import { useFBSRate } from "@/hooks/use-secondary-rate";
import { useActivTradesRate } from "@/hooks/use-activtrades-rate";
import { useTickmillRate } from "@/hooks/use-tickmill-rate";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const CURRENCY_PAIRS = [
  { value: "USDBRL", label: "USDBRL" },
  { value: "EURUSD", label: "EURUSD" },
  { value: "USDMXN", label: "USDMXN" }
];

export function ExchangeRatesWidget() {
  const { t } = useTranslation();
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  const { exchangeRates, isLoading, error } = useXTB();
  const { data: fbsRate, isLoading: isLoadingFBS, error: fbsError } = useFBSRate(selectedPair);
  const { data: activTradesRate, isLoading: isLoadingActivTrades, error: activTradesError } = useActivTradesRate(selectedPair);
  const { data: tickmillRate, isLoading: isLoadingTickmill, error: tickmillError } = useTickmillRate(selectedPair);

  const selectedRate = exchangeRates?.find(rate => rate.symbol === selectedPair);

  const renderFBSRate = () => {
    if (fbsError) {
      return <div className="text-destructive">Error loading FBS rate: {fbsError.message}</div>;
    }

    return (
      <div className="space-y-2 p-4 rounded-lg border">
        <div className="text-sm text-muted-foreground">FBS Rate</div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {fbsRate ? fbsRate.bid.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Bid Price')}</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {fbsRate ? fbsRate.ask.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">{t('Ask Price')}</div>
        </div>
      </div>
    );
  };

  const renderActivTradesRate = () => {
    if (activTradesError) {
      return <div className="text-destructive">Error loading ActivTrades rate</div>;
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
      return <div className="text-destructive">Error loading Tickmill rate</div>;
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

  return (
    <Card className="bg-background shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {t('Live Exchange Rates')}
            {(isLoading || isLoadingFBS || isLoadingActivTrades || isLoadingTickmill) && <Loader2 className="h-4 w-4 animate-spin" />}
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
        {error ? (
          <div className="text-destructive">
            Error loading rates: {error.message}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              {selectedRate && (
                <div className="space-y-2 p-4 rounded-lg border">
                  <div className="text-sm text-muted-foreground">{t('XTB Rate')}</div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{selectedRate.bid.toFixed(4)}</div>
                    <div className="text-sm text-muted-foreground">{t('Bid Price')}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{selectedRate.ask.toFixed(4)}</div>
                    <div className="text-sm text-muted-foreground">{t('Ask Price')}</div>
                  </div>
                </div>
              )}
              {renderFBSRate()}
            </div>
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