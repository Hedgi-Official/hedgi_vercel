import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Interface for closed trades returned from API
interface ClosedTrade {
  symbol: string;
  volume: string;
  openTime: string;
  closedAt: string;
  status: string;
}

export function TradeHistory() {
  const [expanded, setExpanded] = useState(false);

  // Fetch trade history when expanded
  const {
    data: tradeHistory = [],
    isLoading: historyLoading,
    error: historyError
  } = useQuery({
    queryKey: ["trades", "history"],
    queryFn: async () => {
      const response = await fetch("/api/trades/history");
      if (!response.ok) {
        throw new Error("Failed to fetch trade history");
      }
      return response.json();
    },
    enabled: expanded // Only fetch when expanded
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!expanded) {
    return (
      <Button
        variant="outline"
        className="mt-4 w-full flex justify-between"
        onClick={() => setExpanded(true)}
      >
        <span>Show Trade History</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Trade History</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1"
          >
            <span>Hide</span>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Loading state */}
        {historyLoading && (
          <div className="text-center py-4">Loading trade history...</div>
        )}

        {/* Remove error state - just show empty state */}

        {/* Closed trades section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Past Trades</h3>
          {tradeHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No past trades found.</p>
          ) : (
            <div className="space-y-3">
              {tradeHistory.map((trade: ClosedTrade, index: number) => (
                <div
                  key={`history-${index}`}
                  className="p-3 bg-secondary/20 rounded-md"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium">{trade.symbol}</div>
                    <div className="text-xs px-2 py-0.5 rounded bg-secondary">
                      {trade.status}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDate(trade.openTime)} → {formatDate(trade.closedAt)}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{trade.volume}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}