import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useXTB } from "@/hooks/use-xtb";
import { useFBSRate } from "@/hooks/use-secondary-rate";
import { Loader2, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

const CURRENCY_PAIRS = [
  { value: "USDBRL", label: "USDBRL" },
  { value: "EURUSD", label: "EURUSD" },
  { value: "USDMXN", label: "USDMXN" }
];

export function ExchangeRatesWidget() {
  const { t } = useTranslation();
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  const { exchangeRates, isLoading, error, isConnected } = useXTB();
  const { data: fbsRate, isLoading: isLoadingFBS, error: fbsError } = useFBSRate(selectedPair);

  const selectedRate = exchangeRates?.find(rate => rate.symbol === selectedPair);
  
  // Check if we're using simulated data
  const isSimulated = selectedRate && 
    (selectedRate.timestamp < Date.now() - 5 * 60 * 1000 || // Older than 5 minutes
     selectedRate.ask === 0 || 
     selectedRate.bid === 0);
  
  const renderRateSource = () => {
    if (isSimulated) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="ml-2 bg-yellow-100/50 text-yellow-700 hover:bg-yellow-100/70">
                Simulated
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Using simulated rates because the trading server is currently unavailable. 
                Hedge simulation will still work, but actual trade execution may not be possible.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  const renderFBSRate = () => {
    // FBS rate panel
    const hasValidRate = fbsRate && !fbsRate.error && fbsRate.bid > 0 && fbsRate.ask > 0;
    
    return (
      <div className="space-y-2 p-4 rounded-lg border">
        <div className="flex items-center">
          <div className="text-sm text-muted-foreground">Secondary Rate</div>
          {fbsError && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Error retrieving secondary rate</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {hasValidRate ? fbsRate.bid.toFixed(4) : (
              isLoadingFBS ? 'Loading...' : '-.----'
            )}
          </div>
          <div className="text-sm text-muted-foreground">{t('Bid Price')}</div>
        </div>
        
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {hasValidRate ? fbsRate.ask.toFixed(4) : (
              isLoadingFBS ? 'Loading...' : '-.----'
            )}
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
            {(isLoading || isLoadingFBS) && <Loader2 className="h-4 w-4 animate-spin" />}
            {renderRateSource()}
          </div>
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-[180px] md:w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_PAIRS.map(pair => (
                <SelectItem key={pair.value} value={pair.value}>
                  {pair.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : selectedRate ? (
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground">Primary Rate</div>
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