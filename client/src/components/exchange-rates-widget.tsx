import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useXTB } from "@/hooks/use-xtb";
import { Loader2 } from "lucide-react";

export function ExchangeRatesWidget() {
  const { exchangeRates, isLoading, error } = useXTB();

  if (error) {
    return (
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Live Exchange Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Live Exchange Rates
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {exchangeRates?.map((rate) => (
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
      </CardContent>
    </Card>
  );
}
