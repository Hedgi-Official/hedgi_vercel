import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import type { FlaskTrade } from '@db/schema';

export function FlaskTradeHistory() {
  const { data: historyTrades, isLoading } = useQuery<FlaskTrade[]>({
    queryKey: ['/api/trades/history'],
    queryFn: async () => {
      const response = await fetch('/api/trades/history', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch trade history');
      return response.json();
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Closed': return 'outline';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        {!historyTrades || historyTrades.length === 0 ? (
          <p className="text-muted-foreground">No completed trades</p>
        ) : (
          <div className="space-y-4">
            {historyTrades.map((trade) => {
              const metadata = trade.metadata ? JSON.parse(trade.metadata) : {};
              const hedgeData = metadata.hedgeData || {};
              
              return (
                <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {trade.symbol} - {trade.direction.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Volume: {trade.volume} | Rate: {hedgeData.rate || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Completed: {new Date(trade.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(trade.status)}>
                      {trade.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Flask ID: {trade.flaskTradeId}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}