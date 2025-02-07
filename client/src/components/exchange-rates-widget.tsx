import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useXTB } from "@/hooks/use-xtb";
import { useSecondaryRate } from "@/hooks/use-secondary-rate";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const CURRENCY_PAIRS = [
  { value: "USDBRL", label: "USD/BRL - US Dollar/Brazilian Real" },
  { value: "EURUSD", label: "EUR/USD - Euro/US Dollar" },
  { value: "USDMXN", label: "USD/MXN - US Dollar/Mexican Peso" }
];

export function ExchangeRatesWidget() {
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  const { exchangeRates, isLoading, error, isConnected } = useXTB();
  const { data: secondaryRate, isLoading: isLoadingSecondary } = useSecondaryRate();

  const selectedRate = exchangeRates?.find(rate => rate.symbol === selectedPair);
  const showSecondaryRate = selectedPair === "USDBRL"; // Only show for USDBRL

  return (
    <Card className="bg-background shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Live Exchange Rates
            {(isLoading || isLoadingSecondary) && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isConnected && <span className="text-sm text-muted-foreground">(Connecting...)</span>}
          </div>
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_PAIRS.map(pair => (
                <SelectItem key={pair.value} value={pair.value}>
                  {pair.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-destructive">
            Error: {error}
            {!isConnected && " (Not connected to XTB)"}
          </div>
        ) : isLoading || isLoadingSecondary ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : selectedRate ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground">XTB Rate</div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{selectedRate.bid.toFixed(4)}</div>
                  <div className="text-sm text-muted-foreground">Bid Price</div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{selectedRate.ask.toFixed(4)}</div>
                  <div className="text-sm text-muted-foreground">Ask Price</div>
                </div>
              </div>
              {showSecondaryRate && (
                <div className="space-y-2 p-4 rounded-lg border">
                  <div className="text-sm text-muted-foreground">Secondary Rate</div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {secondaryRate ? Number(secondaryRate.value).toFixed(4) : 'Loading...'}
                    </div>
                    <div className="text-sm text-muted-foreground">USD/BRL</div>
                  </div>
                </div>
              )}
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