import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FlaskTrade } from '@db/schema';

interface TradeWithStatus extends FlaskTrade {
  statusLabel?: string;
}

export function ActiveTrades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active trades (not Closed or FAILED)
  const { data: activeTrades, isLoading } = useQuery<TradeWithStatus[]>({
    queryKey: ['/api/trades/active'],
    queryFn: async () => {
      const response = await fetch('/api/trades/active', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch trades');
      return response.json();
    },
    refetchInterval: 5000 // Poll every 5 seconds
  });

  // Close trade mutation
  const closeTradeM = useMutation({
    mutationFn: async (tradeId: number) => {
      const response = await fetch(`/api/trades/${tradeId}/close`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to close trade');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Trade closed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/history'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to close trade',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Check status mutation
  const checkStatusM = useMutation({
    mutationFn: async (tradeId: number) => {
      const response = await fetch(`/api/trades/${tradeId}/status`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to check status');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Status updated',
        description: `Trade is now: ${data.label}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/active'] });
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'NEW': return 'secondary';
      case 'Executed': return 'default';
      case 'Closed': return 'outline';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Trades</CardTitle>
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
        <CardTitle>Active Trades</CardTitle>
      </CardHeader>
      <CardContent>
        {!activeTrades || activeTrades.length === 0 ? (
          <p className="text-muted-foreground">No active trades</p>
        ) : (
          <div className="space-y-4">
            {activeTrades.map((trade) => {
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
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(trade.status)}>
                        {trade.status === 'NEW' ? 'Order sent' :
                         trade.status === 'Executed' ? 'Order placed' :
                         trade.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Flask ID: {trade.flaskTradeId}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => checkStatusM.mutate(trade.id)}
                      disabled={checkStatusM.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${checkStatusM.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive/90"
                      onClick={() => closeTradeM.mutate(trade.id)}
                      disabled={closeTradeM.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
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