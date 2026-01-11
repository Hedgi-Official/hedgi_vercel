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
        <div className="bg-muted/50 rounded-lg px-3 py-2 border border-border grid grid-cols-3 items-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">{brokerLabel}</div>
          <div className="col-span-2 text-destructive text-xs">{t('exchangeRates.error')}</div>
        </div>
      );
    }
    
    if (rate && rate.error) {
      return (
        <div className="bg-muted/50 rounded-lg px-3 py-2 border border-border grid grid-cols-3 items-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">{brokerLabel}</div>
          <div className="col-span-2 text-destructive text-xs">{rate.error}</div>
        </div>
      );
    }

    return (
      <div className="bg-muted/50 rounded-lg px-3 py-2 border border-border grid grid-cols-3 items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">{brokerLabel}</div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">{t('exchangeRates.salePrice')}</div>
          <div className="text-sm font-semibold text-foreground">{rate ? rate.bid.toFixed(4) : '—'}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">{t('exchangeRates.purchasePrice')}</div>
          <div className="text-sm font-semibold text-foreground">{rate ? rate.ask.toFixed(4) : '—'}</div>
        </div>
      </div>
    );
  };

  const isLoading = isLoadingActivTrades || isLoadingTickmill || isLoadingFBS;

  return (
    <Card className="flex-none flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {t('Live Exchange Rates')}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardTitle>
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-[120px] h-7 text-xs">
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
      <CardContent className="pt-0 flex-1 overflow-y-auto space-y-2">
        {(isLoadingActivTrades && isLoadingTickmill && isLoadingFBS) ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {renderRateCard(t('exchangeRates.brokerA'), activtradesRate, activtradesError)}
              {renderRateCard(t('exchangeRates.brokerB'), tickmillRate, tickmillError)}
              {renderRateCard(t('exchangeRates.brokerC'), fbsRate, fbsError)}
            </div>
            <div className="text-[10px] text-muted-foreground p-1.5 bg-amber-50 border border-amber-200 rounded">
              {t('Market Hours Notice')}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}