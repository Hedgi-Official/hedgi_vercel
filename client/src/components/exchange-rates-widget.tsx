import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivTradesRate } from "@/hooks/use-activtrades-rate";
import { useTickmillRate } from "@/hooks/use-tickmill-rate";
import { useFBSRate } from "@/hooks/use-fbs-rate";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExchangeRate } from "@/types/exchange-rate";

export function ExchangeRatesWidget() {
  const { t } = useTranslation();
  const { data: activtradesRate, isLoading: isLoadingActivTrades, error: activtradesError } = useActivTradesRate("USDBRL");
  const { data: tickmillRate, isLoading: isLoadingTickmill, error: tickmillError } = useTickmillRate("USDBRL");
  const { data: fbsRate, isLoading: isLoadingFBS, error: fbsError } = useFBSRate("USDBRL");

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
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {t('Live Exchange Rates')} - USDBRL
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </CardTitle>
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