import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Interface for open trades returned from API
interface OpenTrade {
  symbol: string;
  volume: string;
  openTime: string;
  tradeOrderNumber?: number;
}

// Interface for closed trades returned from API
interface ClosedTrade extends OpenTrade {
  closedAt: string;
  status: string;
}

export function TradeHistory() {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Fetch open trades when expanded
  const {
    data: openTrades = [],
    isLoading: openTradesLoading,
    error: openTradesError
  } = useQuery({
    queryKey: ["trades", "open"],
    queryFn: async () => {
      const response = await fetch("/api/trades/open");
      if (!response.ok) {
        throw new Error("Failed to fetch open trades");
      }
      return response.json();
    },
    enabled: expanded // Only fetch when expanded
  });

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

  // Mutation for cancelling trades
  const cancelTradeMutation = useMutation({
    mutationFn: async (tradeOrderNumber: number) => {
      const response = await fetch("/api/trades/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tradeOrderNumber }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to cancel trade");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch open trades after cancellation
      queryClient.invalidateQueries({ queryKey: ["trades", "open"] });
    },
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle trade cancellation
  const handleCancelTrade = async (tradeOrderNumber: number) => {
    try {
      await cancelTradeMutation.mutate(tradeOrderNumber);
    } catch (error) {
      console.error("Error cancelling trade:", error);
    }
  };

  if (!expanded) {
    return (
      <Button
        variant="outline"
        className="mt-4 w-full flex justify-between"
        onClick={() => setExpanded(true)}
      >
        <span>Show Past Hedges</span>
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
        {(openTradesLoading || historyLoading) && (
          <div className="text-center py-4">Loading trade data...</div>
        )}

        {/* Error state */}
        {(openTradesError || historyError) && (
          <div className="text-red-500 py-4">
            Error loading trade data. Please try again.
          </div>
        )}

        {/* Open trades section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Open Trades</h3>
          {openTrades.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open trades found.</p>
          ) : (
            <div className="space-y-3">
              {openTrades.map((trade: OpenTrade, index: number) => (
                <div
                  key={`open-${index}`}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-md"
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-medium">{trade.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {trade.volume} • Opened {formatDate(trade.openTime)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => trade.tradeOrderNumber && handleCancelTrade(trade.tradeOrderNumber)}
                    disabled={cancelTradeMutation.isPending}
                    title="Cancel Trade"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-4" />

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