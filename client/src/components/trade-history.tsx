import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Interface for trade basic info from history endpoint
interface TradeBasicInfo {
  id: number;
  flaskTradeId?: number;
  ticket: string;
  symbol: string;
  volume: string;
  openTime: string;
}

// Interface for completed trades with status
interface ClosedTrade extends TradeBasicInfo {
  closedAt: string;
  status: string;
}

export function TradeHistory() {
  const [expanded, setExpanded] = useState(false);

  // Fetch all trades and their individual statuses when expanded
  const {
    data: tradeHistory = [],
    isLoading: historyLoading,
    error: historyError
  } = useQuery({
    queryKey: ["trades", "history", "completed"],
    queryFn: async () => {
      console.log('=== FETCHING TRADE HISTORY ===');
      
      // 1. Get basic trade info from history endpoint (NO status fetching here)
      const response = await fetch("/api/trades/history");
      if (!response.ok) {
        throw new Error("Failed to fetch trade history");
      }
      const allTrades: TradeBasicInfo[] = await response.json();
      console.log(`Got ${allTrades.length} trades from history endpoint`, allTrades);

      // 2. Check status of each trade individually to find completed ones
      const completedTrades: ClosedTrade[] = [];

      for (const trade of allTrades) {
        try {
          console.log(`Checking status for trade ${trade.id}`);
          
          // Only check status for trades with Flask IDs
          if (!trade.flaskTradeId) {
            console.log(`Skipping trade ${trade.id} - no Flask ID`);
            continue;
          }

          const statusResponse = await fetch(`/api/trades/${trade.id}/status`);
          if (!statusResponse.ok) {
            console.log(`Failed to get status for trade ${trade.id}`);
            continue;
          }

          const statusData = await statusResponse.json();
          console.log(`Trade ${trade.id} status:`, statusData);

          // Only include completed trades
          const isCompleted = ['closed', 'failed', 'executed', 'cancelled', 'completed']
            .includes(statusData.status.toLowerCase());

          if (isCompleted && statusData.closedAt) {
            completedTrades.push({
              ...trade,
              status: statusData.status,
              closedAt: statusData.closedAt
            });
            console.log(`Added completed trade ${trade.id} to history`);
          } else {
            console.log(`Trade ${trade.id} not completed - status: ${statusData.status}`);
          }
        } catch (error) {
          console.error(`Error checking trade ${trade.id}:`, error);
        }
      }

      console.log(`=== COMPLETED TRADES: ${completedTrades.length} ===`);
      return completedTrades;
    },
    enabled: expanded // Only fetch when expanded
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date available';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
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

        {/* Error state */}
        {historyError && (
          <div className="text-red-500 py-4">
            Error loading trade history. Please try again.
          </div>
        )}

        {/* Closed trades section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Past Trades</h3>
          {tradeHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No past trades found.</p>
          ) : (
            <div className="space-y-3">
              {tradeHistory.map((trade: ClosedTrade, index: number) => {
                // Extract ID from ticket (FLASK-XX format) or use regular id
                const displayId = trade.ticket?.startsWith('FLASK-') 
                  ? trade.ticket.replace('FLASK-', '') 
                  : (trade.id || index + 1);

                return (
                  <div
                    key={`history-${index}`}
                    className="p-4 border rounded flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{trade.symbol} (ID: {displayId})</p>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          // Convert volume back to amount (volume * 100,000)
                          const volume = parseFloat(trade.volume || '0');
                          const amount = volume * 100000;

                          // Extract base currency from symbol (e.g., USDBRL -> USD)
                          const baseCurrency = trade.symbol?.substring(0, 3) || 'USD';
                          const currencySymbol = baseCurrency === 'USD' ? '$' : 
                                               baseCurrency === 'EUR' ? '€' : 
                                               baseCurrency === 'BRL' ? 'R$' : 
                                               baseCurrency === 'MXN' ? '$' : '';

                          return `${currencySymbol}${amount.toLocaleString('en-US')} ${baseCurrency}`;
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: {trade.status || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <div className="text-xs mt-1">
                        {trade.closedAt ? formatDate(trade.closedAt) : 'No date available'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}