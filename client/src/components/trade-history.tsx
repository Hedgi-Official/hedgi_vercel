import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Interface for closed trades returned from API
interface ClosedTrade {
  id?: number;
  ticket?: string;
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
      const data = await response.json();
      console.log('Trade history received from backend:', data);
      console.log('Sample trade data:', data[0]);
      if (data[0]) {
        console.log('First trade status:', data[0].status);
        console.log('First trade closedAt:', data[0].closedAt);
      }
      return data;
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
                console.log(`=== TRADE ${index} DEBUG ===`);
                console.log('Individual trade data received:', trade);
                console.log('Trade status:', trade.status, typeof trade.status);
                console.log('Trade closedAt:', trade.closedAt, typeof trade.closedAt);
                console.log('Raw trade object keys:', Object.keys(trade));
                console.log('================================');
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