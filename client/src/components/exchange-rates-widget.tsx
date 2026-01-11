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

  const renderRateCard = (
    brokerLabel: string, 
    rate: { bid: number; ask: number; error?: string } | undefined, 
    error: Error | null
  ) => {
    if (error) {
      return (
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">{brokerLabel}</div>
          <div className="text-destructive text-xs">{t('exchangeRates.error')}</div>
        </div>
      );
    }
    
    if (rate && rate.error) {
      return (
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">{brokerLabel}</div>
          <div className="text-destructive text-xs">{rate.error}</div>
        </div>
      );
    }

    return (
      <div className="bg-muted/50 rounded-lg p-3 border border-border">
        <div className="text-xs font-medium text-muted-foreground mb-2">{brokerLabel}</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">
              {t('exchangeRates.salePrice')}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {rate ? rate.bid.toFixed(4) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">
              {t('exchangeRates.purchasePrice')}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {rate ? rate.ask.toFixed(4) : '—'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isLoading = isLoadingActivTrades || isLoadingTickmill || isLoadingFBS;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {t('Live Exchange Rates')}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardTitle>
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
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
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {(isLoadingActivTrades && isLoadingTickmill && isLoadingFBS) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {renderRateCard(t('exchangeRates.brokerA'), activtradesRate, activtradesError)}
              {renderRateCard(t('exchangeRates.brokerB'), tickmillRate, tickmillError)}
              {renderRateCard(t('exchangeRates.brokerC'), fbsRate, fbsError)}
            </div>
            <div className="text-xs text-muted-foreground p-2 bg-amber-50 border border-amber-200 rounded-md">
              {t('Market Hours Notice')}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}