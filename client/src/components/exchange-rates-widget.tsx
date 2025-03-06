import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useXTB } from "@/hooks/use-xtb";
import { useFBSRate } from "@/hooks/use-secondary-rate";
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
  const { exchangeRates, isLoading, error, refetch } = useXTB();
  const { data: fbsRate, isLoading: isLoadingFBS, error: fbsError, refetch: refetchFBS } = useFBSRate(selectedPair);

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

  // Refresh rates every 20 seconds
  useInterval(() => {
    if (!isLoading) {
      refetch();
      refetchFBS();
    }
  }, 20000);

  return (
    <Card className="bg-background shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {t('Live Exchange Rates')}
            {(isLoading || isLoadingFBS) && <Loader2 className="h-4 w-4 animate-spin" />}
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
        ) : selectedRate ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
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
              {renderFBSRate()}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-4">
            No exchange rates available for {selectedPair}
          </div>
        )}
      </CardContent>
    </Card>
  );
}