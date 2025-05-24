import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, TrendingUp, TrendingDown, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Trade {
  id: number;
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  status: string;
  flaskTradeId?: number;
  createdAt: string;
  updatedAt: string;
}

const TradeManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for open trades
  const { data: openTrades = [], isLoading: openTradesLoading } = useQuery({
    queryKey: ['trades', 'open'],
    queryFn: async () => {
      const response = await fetch('/api/trades/open');
      if (!response.ok) throw new Error('Failed to fetch open trades');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Query for trade history
  const { data: tradeHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['trades', 'history'],
    queryFn: async () => {
      const response = await fetch('/api/trades/history');
      if (!response.ok) throw new Error('Failed to fetch trade history');
      return response.json();
    },
  });

  // Mutation to create a new trade
  const createTradeMutation = useMutation({
    mutationFn: async (tradeData: { symbol: string; direction: string; volume: number; metadata?: any }) => {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData),
      });
      if (!response.ok) throw new Error('Failed to create trade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', 'open'] });
      toast({
        title: "Trade Created",
        description: "Your hedge order has been placed successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to create trade",
        variant: "destructive",
      });
    },
  });

  // Mutation to close a trade
  const closeTradeMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      const response = await fetch(`/api/trades/${tradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to close trade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', 'open'] });
      queryClient.invalidateQueries({ queryKey: ['trades', 'history'] });
      toast({
        title: "Trade Closed",
        description: "Your trade has been closed successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Close Failed",
        description: error.message || "Failed to close trade",
        variant: "destructive",
      });
    },
  });

  // Function to check trade status
  const checkTradeStatus = async (tradeId: number) => {
    try {
      const response = await fetch(`/api/trades/${tradeId}/status`);
      if (!response.ok) throw new Error('Failed to check status');
      const data = await response.json();
      toast({
        title: "Trade Status",
        description: `Status: ${data.label || data.status}`,
      });
    } catch (error: any) {
      toast({
        title: "Status Check Failed",
        description: error.message || "Failed to check trade status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500';
      case 'Executed': return 'bg-green-500';
      case 'Closed': return 'bg-gray-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const TradeCard = ({ trade, showCloseButton = false }: { trade: Trade; showCloseButton?: boolean }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{trade.symbol}</span>
              <Badge variant={trade.direction === 'buy' ? 'default' : 'secondary'}>
                {trade.direction === 'buy' ? (
                  <><TrendingUp className="w-3 h-3 mr-1" /> BUY</>
                ) : (
                  <><TrendingDown className="w-3 h-3 mr-1" /> SELL</>
                )}
              </Badge>
              <Badge className={getStatusColor(trade.status)}>
                {trade.status}
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              <p>Volume: {trade.volume}</p>
              <p>Created: {new Date(trade.createdAt).toLocaleString()}</p>
              {trade.flaskTradeId && <p>Flask ID: {trade.flaskTradeId}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkTradeStatus(trade.id)}
            >
              Check Status
            </Button>
            {showCloseButton && trade.status !== 'Closed' && trade.status !== 'FAILED' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => closeTradeMutation.mutate(trade.id)}
                disabled={closeTradeMutation.isPending}
              >
                <X className="w-3 h-3 mr-1" />
                Close
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trade Management</h1>
        <p className="text-gray-600">Monitor and manage your hedge trades</p>
      </div>

      {/* Quick Test Section */}
      <Card className="mb-6 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            Test Trade Creation (Payment Bypass)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Button
              onClick={() => createTradeMutation.mutate({
                symbol: 'USDMXN',
                direction: 'buy',
                volume: 10000,
                metadata: { test: true, bypassPayment: true }
              })}
              disabled={createTradeMutation.isPending}
              className="w-full"
            >
              Test MXN Hedge (Buy)
            </Button>
            <Button
              onClick={() => createTradeMutation.mutate({
                symbol: 'USDBRL',
                direction: 'sell',
                volume: 5000,
                metadata: { test: true, bypassPayment: true }
              })}
              disabled={createTradeMutation.isPending}
              className="w-full"
              variant="outline"
            >
              Test BRL Hedge (Sell)
            </Button>
            <Button
              onClick={() => createTradeMutation.mutate({
                symbol: 'EURUSD',
                direction: 'buy',
                volume: 7500,
                metadata: { test: true, bypassPayment: true }
              })}
              disabled={createTradeMutation.isPending}
              className="w-full"
              variant="secondary"
            >
              Test EUR Hedge (Buy)
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            These buttons bypass the payment system for testing purposes. Click to create test hedge trades.
          </p>
        </CardContent>
      </Card>

      {/* Trade Management Tabs */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open">
            Open Trades ({openTrades.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Trade History ({tradeHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Hedge Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {openTradesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p>Loading open trades...</p>
                </div>
              ) : openTrades.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No open trades found</p>
                  <p className="text-sm">Create a test trade using the buttons above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {openTrades.map((trade: Trade) => (
                    <TradeCard key={trade.id} trade={trade} showCloseButton={true} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p>Loading trade history...</p>
                </div>
              ) : tradeHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trade history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tradeHistory.map((trade: Trade) => (
                    <TradeCard key={trade.id} trade={trade} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradeManagement;