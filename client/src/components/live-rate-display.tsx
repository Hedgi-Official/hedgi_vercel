import { useMT5Rates } from '@/hooks/use-mt5-rates';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function LiveRateDisplay() {
  const { rate, status, error } = useMT5Rates();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Live FBS Rate
          {status === 'connecting' && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-destructive">{error}</div>
        ) : rate ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bid</p>
                <p className="text-2xl font-bold text-primary">{rate.bid.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ask</p>
                <p className="text-2xl font-bold text-primary">{rate.ask.toFixed(4)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Last update: {new Date(rate.time).toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground">Waiting for rates...</div>
        )}
      </CardContent>
    </Card>
  );
}
