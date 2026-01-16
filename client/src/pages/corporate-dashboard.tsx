import * as React from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Play,
  Square,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
} from "lucide-react";

interface BrokerQuote {
  broker: string;
  bid: number;
  ask: number;
  total_cost_quote: number;
  spread_cost_quote: number;
  swap_cost_quote: number;
  recommended: boolean;
  savings_vs_worst: number;
  market_open: boolean;
}

interface SimulateResponse {
  symbol: string;
  direction: string;
  volume: number;
  duration_days: number;
  best_broker: string;
  brokers: BrokerQuote[];
}

interface Order {
  id: number;
  symbol: string;
  direction: string;
  volume: number;
  status: string;
  entry_price?: number;
  current_price?: number;
  pnl?: number;
  pnl_pct?: number;
  created_at: string;
  metadata?: Record<string, any>;
}

export default function CorporateDashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [simulateForm, setSimulateForm] = React.useState({
    symbol: "USDBRL",
    direction: "buy",
    volume: "0.1",
    duration_days: "7",
  });

  const [simulateResult, setSimulateResult] = React.useState<SimulateResponse | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false);
  const [orderToClose, setOrderToClose] = React.useState<Order | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  React.useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (user.userType !== "business") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const ordersQuery = useQuery({
    queryKey: ["hedgi-orders"],
    queryFn: async () => {
      const res = await fetch("/api/hedgi/orders", {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch orders");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        return { orders: data };
      }
      return data;
    },
    refetchInterval: 10000,
    enabled: !!user && user.userType === "business",
  });

  const simulateMutation = useMutation({
    mutationFn: async (data: typeof simulateForm) => {
      const res = await fetch("/api/hedgi/quotes/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol: data.symbol,
          direction: data.direction.toLowerCase(),
          volume: parseFloat(data.volume),
          duration_days: parseInt(data.duration_days),
          best_only: false,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        const errorMsg = error.error || 
          (Array.isArray(error.detail) ? error.detail.map((d: any) => d.msg).join(", ") : error.detail) || 
          "Simulation failed";
        throw new Error(errorMsg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSimulateResult(data);
      toast({ title: "Simulation complete", description: "Quote generated successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Simulation failed", description: error.message });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hedgi/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol: simulateForm.symbol,
          direction: simulateForm.direction.toLowerCase(),
          volume: parseFloat(simulateForm.volume),
          duration_days: parseInt(simulateForm.duration_days),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        const errorMsg = error.error || 
          (Array.isArray(error.detail) ? error.detail.map((d: any) => d.msg).join(", ") : error.detail) || 
          "Order creation failed";
        throw new Error(errorMsg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Order created", description: `Order ID: ${data.id}` });
      queryClient.invalidateQueries({ queryKey: ["hedgi-orders"] });
      setSimulateResult(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Order failed", description: error.message });
    },
  });

  const closeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await fetch(`/api/hedgi/orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.detail || "Close order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Order closed", description: `Final P&L: ${data.realized_pnl?.toFixed(2) || "N/A"}` });
      queryClient.invalidateQueries({ queryKey: ["hedgi-orders"] });
      setCloseDialogOpen(false);
      setOrderToClose(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Close failed", description: error.message });
    },
  });

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    simulateMutation.mutate(simulateForm);
  };

  const handleExecute = () => {
    createOrderMutation.mutate();
  };

  const handleCloseOrder = (order: Order) => {
    setOrderToClose(order);
    setCloseDialogOpen(true);
  };

  const confirmCloseOrder = () => {
    if (orderToClose) {
      closeOrderMutation.mutate(orderToClose.id);
    }
  };

  const orders = ordersQuery.data?.orders || [];
  const openOrders = orders.filter((o: Order) => o.status === "OPEN" || o.status === "open");
  const closedOrders = orders.filter((o: Order) => o.status === "CLOSED" || o.status === "closed");

  if (!user || user.userType !== "business") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={false} username={user?.username} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Corporate Dashboard</h1>
            <p className="text-muted-foreground">
              {user.companyName || "Your Company"} - API Trading Console
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Activity className="w-3 h-3 mr-1" />
            API Connected
          </Badge>
        </div>

        <Tabs defaultValue="simulate" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="simulate">Simulate</TabsTrigger>
            <TabsTrigger value="open">
              Open Orders ({openOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="simulate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Simulate Hedge
                  </CardTitle>
                  <CardDescription>
                    Preview costs and venues before executing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSimulate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="symbol">Currency Pair</Label>
                        <Select
                          value={simulateForm.symbol}
                          onValueChange={(v) => setSimulateForm((f) => ({ ...f, symbol: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USDBRL">USD/BRL</SelectItem>
                            <SelectItem value="EURUSD">EUR/USD</SelectItem>
                            <SelectItem value="USDMXN">USD/MXN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="direction">Direction</Label>
                        <Select
                          value={simulateForm.direction}
                          onValueChange={(v) => setSimulateForm((f) => ({ ...f, direction: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="buy">Buy (Long)</SelectItem>
                            <SelectItem value="sell">Sell (Short)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="volume">Volume (lots)</Label>
                        <Input
                          id="volume"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={simulateForm.volume}
                          onChange={(e) => setSimulateForm((f) => ({ ...f, volume: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (days)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          max="365"
                          value={simulateForm.duration_days}
                          onChange={(e) => setSimulateForm((f) => ({ ...f, duration_days: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={simulateMutation.isPending}
                    >
                      {simulateMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Simulating...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Simulate
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Quote Result
                  </CardTitle>
                  <CardDescription>
                    {simulateResult
                      ? `${simulateResult.symbol} ${simulateResult.direction.toUpperCase()} ${simulateResult.volume} lots for ${simulateResult.duration_days} days`
                      : "Run a simulation to see results"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {simulateResult ? (
                    <div className="space-y-4">
                      {(() => {
                        const bestBroker = simulateResult.brokers.find(b => b.recommended) || simulateResult.brokers[0];
                        return bestBroker ? (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Recommended Broker</span>
                              <Badge variant="secondary">{bestBroker.broker}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Bid/Ask</span>
                                <p className="font-mono font-bold">
                                  {bestBroker.bid?.toFixed(5)} / {bestBroker.ask?.toFixed(5)}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Spread Cost</span>
                                <p className="font-mono font-bold">
                                  ${bestBroker.spread_cost_quote?.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Swap Cost</span>
                                <p className="font-mono">
                                  ${bestBroker.swap_cost_quote?.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Cost</span>
                                <p className="font-mono font-bold text-primary">
                                  ${bestBroker.total_cost_quote?.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            {bestBroker.savings_vs_worst > 0 && (
                              <div className="mt-2 text-xs text-emerald-600">
                                Saves ${bestBroker.savings_vs_worst.toFixed(2)} vs worst option
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}

                      {simulateResult.brokers && simulateResult.brokers.length > 1 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">All Brokers</h4>
                          <div className="space-y-2">
                            {simulateResult.brokers.map((broker, i) => (
                              <div
                                key={i}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  broker.market_open ? (broker.recommended ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/50") : "bg-muted/20 opacity-50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{broker.broker}</span>
                                  {broker.recommended && <Badge variant="outline" className="text-xs">Best</Badge>}
                                  {!broker.market_open && <Badge variant="destructive" className="text-xs">Closed</Badge>}
                                </div>
                                <span className="font-mono">
                                  ${broker.total_cost_quote?.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleExecute}
                        className="w-full"
                        disabled={createOrderMutation.isPending}
                      >
                        {createOrderMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Execute Order
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                      <p>No simulation results yet</p>
                      <p className="text-sm">Fill in the form and click Simulate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="open">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Open Positions</CardTitle>
                  <CardDescription>
                    {openOrders.length} active hedge{openOrders.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ordersQuery.refetch()}
                  disabled={ordersQuery.isFetching}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {ordersQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : ordersQuery.isError ? (
                  <div className="flex items-center justify-center py-8 text-destructive">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {(ordersQuery.error as Error).message}
                  </div>
                ) : openOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mb-4 opacity-20" />
                    <p>No open positions</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openOrders.map((order: Order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.id}</TableCell>
                          <TableCell>{order.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={order.direction === "BUY" ? "default" : "secondary"}>
                              {order.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.volume}</TableCell>
                          <TableCell className="font-mono">
                            {order.entry_price?.toFixed(5) || "-"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {order.current_price?.toFixed(5) || "-"}
                          </TableCell>
                          <TableCell>
                            {order.pnl !== undefined ? (
                              <span className={order.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                                {order.pnl >= 0 ? (
                                  <TrendingUp className="w-4 h-4 inline mr-1" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 inline mr-1" />
                                )}
                                ${order.pnl.toFixed(2)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCloseOrder(order)}
                            >
                              <Square className="w-3 h-3 mr-1" />
                              Close
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Closed Positions</CardTitle>
                <CardDescription>
                  {closedOrders.length} completed hedge{closedOrders.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {closedOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mb-4 opacity-20" />
                    <p>No closed positions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Exit</TableHead>
                        <TableHead>Realized P&L</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedOrders.map((order: Order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.id}</TableCell>
                          <TableCell>{order.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={order.direction === "BUY" ? "default" : "secondary"}>
                              {order.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.volume}</TableCell>
                          <TableCell className="font-mono">
                            {order.entry_price?.toFixed(5) || "-"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {order.current_price?.toFixed(5) || "-"}
                          </TableCell>
                          <TableCell>
                            {order.pnl !== undefined ? (
                              <span className={order.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                                ${order.pnl.toFixed(2)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this position?
              {orderToClose && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Order ID:</span>
                    <span className="font-mono">{orderToClose.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Symbol:</span>
                    <span>{orderToClose.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Direction:</span>
                    <span>{orderToClose.direction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volume:</span>
                    <span>{orderToClose.volume}</span>
                  </div>
                  {orderToClose.pnl !== undefined && (
                    <div className="flex justify-between">
                      <span>Current P&L:</span>
                      <span className={orderToClose.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                        ${orderToClose.pnl.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCloseOrder}
              disabled={closeOrderMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {closeOrderMutation.isPending ? "Closing..." : "Close Position"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
