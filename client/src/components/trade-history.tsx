import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

// Interface for closed trades returned from API
interface ClosedTrade {
  id?: number;
  ticket?: string;
  symbol: string;
  volume: string;
  openTime: string;
  closedAt: string;
  status: string;
  current_value?: number | string;
}

export function TradeHistory() {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  // Helper function to get translated trade status
  const getTranslatedStatus = (status: string): string => {
    const statusKey = `simulator.tradeStatus.${status.toUpperCase()}`;
    const translated = t(statusKey);
    // If translation key equals original key, translation doesn't exist, return original status
    return translated === statusKey ? status : translated;
  };

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
    enabled: expanded, // Only fetch when expanded
    refetchInterval: expanded ? 10000 : false, // Refresh every 10 seconds when expanded
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date available';
    try {
      const date = new Date(dateString);
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
        <span>{t('Show Trade History')}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>{t('Trade History')}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1"
          >
            <span>{t('Hide')}</span>
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
          <h3 className="text-lg font-semibold mb-2">{t('Past Trades')}</h3>
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
                    className="p-4 border rounded"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">
                        {t('Hedged')} {(() => {
                          const volume = parseFloat(trade.volume || '0');
                          const amount = volume * 100000;
                          const baseCurrency = trade.symbol?.substring(0, 3) || 'USD';
                          const currencySymbol = baseCurrency === 'USD' ? '$' : 
                                               baseCurrency === 'EUR' ? '€' : 
                                               baseCurrency === 'BRL' ? 'R$' : 
                                               baseCurrency === 'MXN' ? '$' : '';
                          return `${currencySymbol}${amount.toLocaleString('en-US')}`;
                        })()} ({trade.symbol} - ID: {displayId})
                      </p>
                      <div className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                        {trade.closedAt ? formatDate(trade.closedAt) : 'No date available'}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Trade Direction')}:</span>
                        <span className="font-medium">
                          {(() => {
                            // Use direction from Flask response
                            const direction = trade.direction || 'BUY'; // Fallback to BUY if not available
                            const symbol = trade.symbol || 'USDBRL';
                            const targetCurrency = symbol.substring(0, 3); // First 3 characters (e.g., USD from USDBRL)
                            
                            // Map direction to readable labels with currency
                            if (direction.toUpperCase() === 'BUY') {
                              return `${t('simulator.buy')} ${targetCurrency}`;
                            } else {
                              return `${t('simulator.sell')} ${targetCurrency}`;
                            }
                          })()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Hedged Amount')}:</span>
                        <span className="font-medium">
                          {(() => {
                            const volume = parseFloat(trade.volume || '0');
                            const amount = volume * 100000;
                            const baseCurrency = trade.symbol?.substring(0, 3) || 'USD';
                            const currencySymbol = baseCurrency === 'USD' ? '$' : 
                                                 baseCurrency === 'EUR' ? '€' : 
                                                 baseCurrency === 'BRL' ? 'R$' : 
                                                 baseCurrency === 'MXN' ? '$' : '';
                            return `${currencySymbol}${amount.toLocaleString('en-US')}`;
                          })()}
                        </span>
                      </div>
                      
                      {trade.current_value && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('Current Position')}:</span>
                          <span className="font-medium">
                            {typeof trade.current_value === 'number' 
                              ? trade.current_value.toLocaleString('en-US', { 
                                  style: 'currency', 
                                  currency: 'USD', 
                                  minimumFractionDigits: 2 
                                })
                              : trade.current_value}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Status')}:</span>
                        <span className="font-medium">{getTranslatedStatus(trade.status || 'Unknown')}</span>
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