import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useXTB } from "@/hooks/use-xtb";
import { Loader2 } from "lucide-react";

export function ExchangeRatesWidget() {
  const { exchangeRates, isLoading, error, isConnected } = useXTB();

  if (error) {
    return (
      <Card className="bg-background shadow-lg">
        <CardHeader>
          <CardTitle>Live Exchange Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">
            Error: {error}
            {!isConnected && " (Not connected to XTB)"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Live Exchange Rates
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!isConnected && <span className="text-sm text-muted-foreground">(Connecting...)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : exchangeRates && exchangeRates.length > 0 ? (
          <div className="grid gap-4">
            {exchangeRates.map((rate) => (
              <div
                key={rate.symbol}
                className="flex justify-between items-center p-2 rounded-lg border"
              >
                <div className="font-medium">{rate.symbol}</div>
                <div className="space-x-4">
                  <span className="text-muted-foreground">
                    Bid: {rate.bid.toFixed(5)}
                  </span>
                  <span className="text-muted-foreground">
                    Ask: {rate.ask.toFixed(5)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-4">
            No exchange rates available
          </div>
        )}
      </CardContent>
    </Card>
  );
}