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
    rate: { bid: number; ask: number; error?: string } | undefined, 
    error: Error | null
  ) => {
    if (error) {
      return <div className="text-destructive">Error loading {title}: {error.message}</div>;
    }
    
    // Check if we have a rate with an error message (from server-side error handling)
    if (rate && rate.error) {
      return (
        <div className="bg-gray-50 rounded-xl p-6 flex flex-col h-full border border-gray-100">
          <div className="text-sm text-gray-600 mb-3 font-medium text-center">{title}</div>
          <div className="text-destructive text-sm flex-1 flex items-center justify-center text-center">{rate.error}</div>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 rounded-xl p-6 flex flex-col h-full border border-gray-100">
        <div className="text-sm text-gray-600 mb-3 font-medium text-center">{title}</div>
        <div className="space-y-3 flex-1">
          <div className="text-2xl font-bold text-gray-900">
            {rate ? rate.bid.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-gray-500">{t('Bid Price')}</div>
        </div>
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {rate ? rate.ask.toFixed(4) : 'Loading...'}
          </div>
          <div className="text-sm text-gray-500">{t('Ask Price')}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Currency Pair Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {(isLoadingActivTrades || isLoadingTickmill || isLoadingFBS) && 
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          }
        </div>
        <Select value={selectedPair} onValueChange={setSelectedPair}>
          <SelectTrigger className="w-[280px] border-gray-200 bg-white">
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

      {/* Rate Cards */}
      {(isLoadingActivTrades && isLoadingTickmill && isLoadingFBS) ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderRateCard("ActivTrades Rate", activtradesRate, activtradesError)}
            {renderRateCard("Tickmill Rate", tickmillRate, tickmillError)}
            {renderRateCard("FBS Rate", fbsRate, fbsError)}
          </div>
          <div className="text-sm text-gray-700 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            {t('Market Hours Notice')}
          </div>
        </div>
      )}
    </div>
  );
}