import * as React from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { calculatePnL, calculateRealizedPnL, formatPnL, LOT_SIZE } from "@/lib/pnl";
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
  Upload,
  FileSpreadsheet,
  Trash2,
  XCircle,
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BusinessSimulator,
  type BusinessSimulatorHandle,
  type CreateOrderPayload,
} from "@/components/business-simulator";

interface Order {
  order_id: number;
  customer_id: string;
  symbol: string;
  direction: string;
  volume: number;
  broker: string;
  broker_ticket?: number;
  entry_price: number;
  status: string;
  timestamp: string;
  created_at?: string;
  estimated_total_cost_quote?: number;
  estimated_spread_cost_quote?: number;
  estimated_swap_cost_quote?: number;
  breakeven_rate?: number;
  quote_currency?: string;
  base_currency?: string;
  current_bid?: number;
  current_ask?: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
  close_price?: number;
  exit_price?: number;
  closed_at?: string;
}

export default function CorporateDashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const simulatorRef = React.useRef<BusinessSimulatorHandle>(null);
  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false);
  const [orderToClose, setOrderToClose] = React.useState<Order | null>(null);

  // AI Assistant state
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<Array<{type: 'user' | 'bot', content: string}>>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [chatLoading, setChatLoading] = React.useState(false);
  const [chatSessionId] = React.useState(() => `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Initialize chat with translated welcome message
  React.useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{type: 'bot', content: t('corporateDashboard.aiWelcome')}]);
    }
  }, [t, chatMessages.length]);

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
        throw new Error(error.error || t('corporateDashboard.fetchOrdersFailed'));
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        return { orders: data };
      }
      return data;
    },
    refetchInterval: 60000, // Reduced from 10s to 60s to lower API load
    enabled: !!user && user.userType === "business",
  });

  const hiddenOrdersQuery = useQuery({
    queryKey: ["hidden-orders"],
    queryFn: async () => {
      const res = await fetch("/api/hedgi/hidden-orders", {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch hidden orders");
      }
      return res.json();
    },
    enabled: !!user && user.userType === "business",
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const hideClosedOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch("/api/hedgi/hidden-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to hide order");
      }
      return res.json();
    },
    onMutate: async (orderId: string) => {
      await queryClient.cancelQueries({ queryKey: ["hidden-orders"] });
      const previousHidden = queryClient.getQueryData<{ orderIds: string[] }>(["hidden-orders"]);
      queryClient.setQueryData(["hidden-orders"], (old: { orderIds: string[] } | undefined) => ({
        orderIds: [...(old?.orderIds || []), orderId],
      }));
      return { previousHidden };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-orders"] });
      toast({ title: t('corporateDashboard.orderRemoved') });
    },
    onError: (error: Error, _orderId, context) => {
      if (context?.previousHidden) {
        queryClient.setQueryData(["hidden-orders"], context.previousHidden);
      }
      toast({ variant: "destructive", title: t('corporateDashboard.hideOrderFailed'), description: error.message });
    },
  });

  const pendingOrdersQuery = useQuery({
    queryKey: ["pending-orders"],
    queryFn: async () => {
      const res = await fetch("/api/pending-orders", {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch pending orders");
      }
      return res.json();
    },
    refetchInterval: 30000,
    enabled: !!user && user.userType === "business",
  });

  const cancelPendingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/pending-orders/${id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      toast({ title: t('corporateDashboard.orderCancelled') });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t('corporateDashboard.cancelFailed'), description: error.message });
    },
  });

  const deletePendingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/pending-orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      toast({ title: t('corporateDashboard.orderDeleted') });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t('corporateDashboard.deleteFailed'), description: error.message });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderBody: CreateOrderPayload) => {
      const res = await fetch("/api/hedgi/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(orderBody),
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
      toast({ title: t('corporateDashboard.orderCreated'), description: `${t('corporateDashboard.orderId')}: ${data.order_id}` });
      queryClient.invalidateQueries({ queryKey: ["hedgi-orders"] });
      simulatorRef.current?.reset();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t('corporateDashboard.orderFailed'), description: error.message });
    },
  });

  // Close OPEN orders using POST /close endpoint
  const closeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await fetch(`/api/hedgi/orders/${orderId}/close`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.detail || "Close order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: t('corporateDashboard.orderClosed'), description: `${t('corporateDashboard.finalPnl')}: ${data.realized_pnl?.toFixed(2) || "N/A"}` });
      queryClient.invalidateQueries({ queryKey: ["hedgi-orders"] });
      setCloseDialogOpen(false);
      setOrderToClose(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t('corporateDashboard.closeFailed'), description: error.message });
    },
  });

  // Cancel PENDING orders using DELETE endpoint
  const cancelApiOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await fetch(`/api/hedgi/orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.detail || "Cancel order failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('corporateDashboard.orderCancelled') });
      queryClient.invalidateQueries({ queryKey: ["hedgi-orders"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t('corporateDashboard.cancelFailed'), description: error.message });
    },
  });

  // Scroll chat to bottom when messages change
  React.useEffect(() => {
    if (chatScrollRef.current) {
      const scrollContainer = chatScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatMessages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat/business-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: chatSessionId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setChatMessages(prev => [...prev, { type: 'bot', content: data.message }]);
        
        // Auto-fill form if we got complete data
        if (data.complete && data.formData) {
          const validSymbols = ['USDBRL', 'EURBRL', 'GBPBRL', 'JPYBRL', 'CNHBRL', 'USDMXN', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCNH'];
          const validDirections = ['buy', 'sell'];
          
          const symbol = validSymbols.includes(data.formData.symbol) ? data.formData.symbol : null;
          const direction = validDirections.includes(data.formData.direction) ? data.formData.direction : null;
          const volume = typeof data.formData.volume === 'number' && data.formData.volume > 0 ? data.formData.volume : null;
          const duration = typeof data.formData.duration_days === 'number' && data.formData.duration_days >= 1 && data.formData.duration_days <= 365 ? data.formData.duration_days : null;
          
          if (symbol && direction && volume && duration) {
            simulatorRef.current?.setForm({
              symbol,
              direction,
              volume: String(volume),
              duration_days: String(duration),
            });
            
            toast({
              title: t('corporateDashboard.formAutoFilled'),
              description: t('corporateDashboard.formAutoFilledDesc'),
            });
          } else {
            toast({
              variant: "destructive",
              title: t('corporateDashboard.invalidParameters'),
              description: t('corporateDashboard.invalidParametersDesc'),
            });
          }
        }
      } else {
        setChatMessages(prev => [...prev, { type: 'bot', content: data.message || t('corporateDashboard.errorGeneric') }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { type: 'bot', content: t('corporateDashboard.errorConnecting') }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCloseOrder = (order: Order) => {
    setOrderToClose(order);
    setCloseDialogOpen(true);
  };

  const confirmCloseOrder = () => {
    if (orderToClose) {
      closeOrderMutation.mutate(orderToClose.order_id);
    }
  };

  const orders = ordersQuery.data?.orders || [];
  const hiddenOrderIds = new Set(hiddenOrdersQuery.data?.orderIds || []);
  const openOrders = orders.filter((o: Order) => o.status === "OPEN" || o.status === "open");
  const closedOrders = orders.filter((o: Order) => 
    (o.status === "CLOSED" || o.status === "closed") && !hiddenOrderIds.has(String(o.order_id))
  );
  // API pending orders - orders stored in Hedgi API waiting for market to open
  const apiPendingOrders = orders.filter((o: Order) => 
    o.status === "PENDING" || o.status === "pending"
  );
  // Scheduled orders - from our local pending_orders table
  const pendingOrders = pendingOrdersQuery.data?.orders || [];
  const activePendingOrders = pendingOrders.filter((o: any) => 
    o.status !== "cancelled" && o.status !== "executed" && o.status !== "closed" && o.status !== "failed" && o.status !== "completed"
  );
  const totalPendingCount = apiPendingOrders.length + activePendingOrders.length;
  const cancelledOrders = pendingOrders.filter((o: any) => o.status === "cancelled");
  const failedOrders = pendingOrders.filter((o: any) => o.status === "failed");

  const dashboardStats = React.useMemo(() => {
    let totalExposure = 0;
    let totalPnL = 0;
    let hasValidPnL = false;

    openOrders.forEach((order: Order) => {
      const notional = (order.volume || 0) * LOT_SIZE;
      totalExposure += notional;

      const pnlResult = calculatePnL({
        direction: order.direction || "",
        entryPrice: order.entry_price || 0,
        currentBid: order.current_bid,
        currentAsk: order.current_ask,
        volume: order.volume || 0,
        symbol: order.symbol || "",
      });

      if (pnlResult?.pnlUsd !== undefined && pnlResult.pnlUsd !== null) {
        totalPnL += pnlResult.pnlUsd;
        hasValidPnL = true;
      }
    });

    return { totalExposure, totalPnL, hasValidPnL };
  }, [openOrders]);

  if (!user || user.userType !== "business") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={false} username={user?.username} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('corporateDashboard.title')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {user.companyName || t('corporateDashboard.yourCompany')} - {t('corporateDashboard.apiTradingConsole')}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link href="/batch-upload">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                {t('corporateDashboard.batchUpload')}
              </Button>
            </Link>
            <Badge variant="outline" className="text-sm">
              <Activity className="w-3 h-3 mr-1" />
              {t('corporateDashboard.apiConnected')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('corporateDashboard.openPositions')}</p>
                  <p className="text-2xl font-bold">{openOrders.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('corporateDashboard.totalExposure')}</p>
                  <p className="text-2xl font-bold">
                    ${dashboardStats.totalExposure.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('corporateDashboard.unrealizedPnl')}</p>
                  <p className={`text-2xl font-bold ${dashboardStats.totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {dashboardStats.hasValidPnL ? formatPnL(dashboardStats.totalPnL, "USD") : "—"}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${dashboardStats.totalPnL >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  {dashboardStats.totalPnL >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('corporateDashboard.pendingOrders')}</p>
                  <p className="text-2xl font-bold">{totalPendingCount}</p>
                  {(apiPendingOrders.length > 0 || activePendingOrders.length > 0) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {apiPendingOrders.length > 0 && `${apiPendingOrders.length} ${t('corporateDashboard.waitingForMarket')}`}
                      {apiPendingOrders.length > 0 && activePendingOrders.length > 0 && " • "}
                      {activePendingOrders.length > 0 && `${activePendingOrders.length} ${t('corporateDashboard.scheduled')}`}
                    </p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="simulate" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-2 sm:grid-cols-4 h-auto sm:h-10 gap-1.5 p-1.5">
            <TabsTrigger value="simulate" className="py-2.5 sm:py-1.5 border border-border/60">{t('corporateDashboard.simulate')}</TabsTrigger>
            <TabsTrigger value="open" className="py-2.5 sm:py-1.5 border border-border/60">
              {t('corporateDashboard.open')} ({openOrders.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="py-2.5 sm:py-1.5 border border-border/60">{t('corporateDashboard.pending')}</TabsTrigger>
            <TabsTrigger value="history" className="py-2.5 sm:py-1.5 border border-border/60">{t('corporateDashboard.history')}</TabsTrigger>
          </TabsList>

          <TabsContent value="simulate" className="space-y-6">
            {/* AI Assistant Card */}
            <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{t('corporateDashboard.aiAssistant')}</CardTitle>
                          <CardDescription>
                            {t('corporateDashboard.aiAssistantDesc')}
                          </CardDescription>
                        </div>
                      </div>
                      {chatOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div ref={chatScrollRef}>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-4 mb-4">
                        <div className="space-y-4">
                          {chatMessages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              {msg.type === 'bot' && (
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Bot className="h-3 w-3 text-primary" />
                                </div>
                              )}
                              <div
                                className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                                  msg.type === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                {msg.content}
                              </div>
                              {msg.type === 'user' && (
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <User className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                          {chatLoading && (
                            <div className="flex items-start gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-3 w-3 text-primary" />
                              </div>
                              <div className="bg-muted rounded-lg px-3 py-2">
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={t('corporateDashboard.aiPlaceholder')}
                        disabled={chatLoading}
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <BusinessSimulator
              ref={simulatorRef}
              endpoint="/api/hedgi/quotes/simulate"
              showCreateOrderButton
              onCreateOrder={(payload) => createOrderMutation.mutate(payload)}
              isCreatingOrder={createOrderMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="open">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>{t('corporateDashboard.openPositions')}</CardTitle>
                  <CardDescription>
                    {openOrders.length} {openOrders.length !== 1 ? t('corporateDashboard.activeHedgesPlural') : t('corporateDashboard.activeHedges')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ordersQuery.refetch()}
                  disabled={ordersQuery.isFetching}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
                  {t('corporateDashboard.refresh')}
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
                    <p>{t('corporateDashboard.noOpenPositions')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('corporateDashboard.id')}</TableHead>
                        <TableHead>{t('corporateDashboard.symbol')}</TableHead>
                        <TableHead>{t('corporateDashboard.direction')}</TableHead>
                        <TableHead>{t('corporateDashboard.volume')}</TableHead>
                        <TableHead>{t('corporateDashboard.entry')}</TableHead>
                        <TableHead>{t('corporateDashboard.current')}</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>{t('corporateDashboard.expiry')}</TableHead>
                        <TableHead>{t('corporateDashboard.broker')}</TableHead>
                        <TableHead>{t('corporateDashboard.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openOrders.map((order: Order) => {
                        const pnlResult = calculatePnL({
                          direction: order.direction || "",
                          entryPrice: order.entry_price || 0,
                          currentBid: order.current_bid,
                          currentAsk: order.current_ask,
                          volume: order.volume || 0,
                          symbol: order.symbol || "",
                        });
                        
                        const currentPrice = pnlResult?.currentPrice;
                        const pnlUsd = pnlResult?.pnlUsd;
                        const entryValue = pnlResult?.entryValue;
                        const currentValue = pnlResult?.currentValue;

                        const orderAny = order as any;
                        const openDateStr = order.timestamp || orderAny.opened_at || orderAny.created_at || orderAny.executed_at || orderAny.open_time;
                        const openDate = openDateStr ? new Date(openDateStr) : null;
                        const durationDays = orderAny.duration_days || orderAny.durationDays || orderAny.duration || 0;
                        let expiryDate: Date | null = null;
                        let daysRemaining: number | null = null;
                        if (openDate && !isNaN(openDate.getTime()) && durationDays > 0) {
                          expiryDate = new Date(openDate);
                          expiryDate.setDate(expiryDate.getDate() + durationDays);
                          const now = new Date();
                          daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        }
                        
                        return (
                          <TableRow key={order.order_id}>
                            <TableCell className="font-mono">{order.order_id}</TableCell>
                            <TableCell>{order.symbol}</TableCell>
                            <TableCell>
                              <Badge variant={order.direction?.toUpperCase() === "BUY" ? "default" : "secondary"}>
                                {order.direction?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.volume}</TableCell>
                            <TableCell className="font-mono">
                              <div>{order.entry_price?.toFixed(5) || "-"}</div>
                              {entryValue !== undefined && (
                                <div className="text-xs text-muted-foreground">
                                  ${entryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono">
                              <div>{currentPrice?.toFixed(5) || "-"}</div>
                              {currentValue !== undefined && (
                                <div className="text-xs text-muted-foreground">
                                  ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {pnlUsd !== undefined && pnlUsd !== null ? (
                                <span className={pnlUsd >= 0 ? "text-emerald-500" : "text-red-500"}>
                                  {pnlUsd >= 0 ? (
                                    <TrendingUp className="w-4 h-4 inline mr-1" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 inline mr-1" />
                                  )}
                                  {formatPnL(pnlUsd, "USD")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{t('corporateDashboard.awaitingData')}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {expiryDate ? (
                                <div className="text-sm">
                                  <div>{expiryDate.toLocaleDateString()}</div>
                                  {daysRemaining !== null && (
                                    <div className={`text-xs ${daysRemaining <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
                                      {daysRemaining > 0 ? `${daysRemaining} ${t('corporateDashboard.daysLeft')}` : daysRemaining === 0 ? t('corporateDashboard.today') : t('corporateDashboard.expired')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.broker}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCloseOrder(order)}
                              >
                                <Square className="w-3 h-3 mr-1" />
                                {t('corporateDashboard.close')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            {/* API Pending Orders - Waiting for Market */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    {t('corporateDashboard.waitingForMarketTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('corporateDashboard.waitingForMarketDesc')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ordersQuery.refetch()}
                  disabled={ordersQuery.isFetching}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
                  {t('corporateDashboard.refresh')}
                </Button>
              </CardHeader>
              <CardContent>
                {ordersQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : apiPendingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">{t('corporateDashboard.noOrdersWaitingForMarket')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('corporateDashboard.id')}</TableHead>
                        <TableHead>{t('corporateDashboard.symbol')}</TableHead>
                        <TableHead>{t('corporateDashboard.direction')}</TableHead>
                        <TableHead>{t('corporateDashboard.volume')}</TableHead>
                        <TableHead>{t('corporateDashboard.created')}</TableHead>
                        <TableHead>{t('corporateDashboard.status')}</TableHead>
                        <TableHead>{t('corporateDashboard.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiPendingOrders.map((order: Order) => (
                        <TableRow key={order.order_id}>
                          <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                          <TableCell>{order.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={order.direction?.toLowerCase() === "buy" ? "default" : "secondary"}>
                              {order.direction?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.volume}</TableCell>
                          <TableCell className="text-sm">
                            {(order.created_at || order.timestamp) ? new Date(order.created_at || order.timestamp).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                              {t('corporateDashboard.waitingForMarket')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelApiOrderMutation.mutate(order.order_id)}
                              disabled={cancelApiOrderMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              {t('corporateDashboard.cancel')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Scheduled Orders - Local Queue */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                    {t('corporateDashboard.scheduledOrdersTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('corporateDashboard.scheduledOrdersDesc')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pendingOrdersQuery.refetch()}
                  disabled={pendingOrdersQuery.isFetching}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${pendingOrdersQuery.isFetching ? "animate-spin" : ""}`} />
                  {t('corporateDashboard.refresh')}
                </Button>
              </CardHeader>
              <CardContent>
                {pendingOrdersQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : activePendingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Clock className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">{t('corporateDashboard.noScheduledOrders')}</p>
                    <p className="text-xs mt-1">{t('corporateDashboard.uploadCsvToSchedule')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('corporateDashboard.id')}</TableHead>
                        <TableHead>{t('corporateDashboard.symbol')}</TableHead>
                        <TableHead>{t('corporateDashboard.direction')}</TableHead>
                        <TableHead>{t('corporateDashboard.volume')}</TableHead>
                        <TableHead>{t('corporateDashboard.durationDays')}</TableHead>
                        <TableHead>{t('corporateDashboard.scheduled')}</TableHead>
                        <TableHead>{t('corporateDashboard.status')}</TableHead>
                        <TableHead>{t('corporateDashboard.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePendingOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.id}</TableCell>
                          <TableCell>{order.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={order.direction === "buy" ? "default" : "secondary"}>
                              {order.direction?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.volume}</TableCell>
                          <TableCell>{order.durationDays || 0}d</TableCell>
                          <TableCell className="text-sm">
                            {order.executeAt ? new Date(order.executeAt).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                order.status === "pending" ? "outline" :
                                order.status === "scheduled" ? "outline" :
                                order.status === "market_closed" ? "secondary" :
                                order.status === "executed" ? "default" :
                                order.status === "completed" ? "default" :
                                order.status === "cancelled" ? "secondary" :
                                "destructive"
                              }
                              className={order.status === "market_closed" ? "border-amber-500 text-amber-700" : ""}
                            >
                              {order.status === "market_closed" ? t('corporateDashboard.marketClosed') : order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(order.status === "pending" || order.status === "market_closed" || order.status === "scheduled") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelPendingMutation.mutate(order.id)}
                                disabled={cancelPendingMutation.isPending}
                              >
                                {t('corporateDashboard.cancel')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('corporateDashboard.closedPositions')}</CardTitle>
                <CardDescription>
                  {closedOrders.length} {closedOrders.length !== 1 ? t('corporateDashboard.completedHedges') : t('corporateDashboard.completedHedge')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {closedOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mb-4 opacity-20" />
                    <p>{t('corporateDashboard.noClosedPositions')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('corporateDashboard.id')}</TableHead>
                        <TableHead>{t('corporateDashboard.symbol')}</TableHead>
                        <TableHead>{t('corporateDashboard.direction')}</TableHead>
                        <TableHead>{t('corporateDashboard.volume')}</TableHead>
                        <TableHead>{t('corporateDashboard.entry')}</TableHead>
                        <TableHead>{t('corporateDashboard.exit')}</TableHead>
                        <TableHead>{t('corporateDashboard.realizedPnl')}</TableHead>
                        <TableHead>{t('corporateDashboard.closed')}</TableHead>
                        <TableHead>{t('corporateDashboard.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedOrders.map((order: Order) => {
                        const exitPrice = order.exit_price ?? order.close_price;
                        const closedDate = order.closed_at || order.timestamp;
                        
                        let pnl: number | null = null;
                        if (exitPrice && order.entry_price && order.direction && order.volume && order.symbol) {
                          pnl = calculateRealizedPnL({
                            direction: order.direction,
                            entryPrice: order.entry_price,
                            exitPrice: exitPrice,
                            volume: order.volume,
                            symbol: order.symbol,
                          });
                        }
                        
                        return (
                          <TableRow key={order.order_id}>
                            <TableCell className="font-mono">{order.order_id}</TableCell>
                            <TableCell>{order.symbol}</TableCell>
                            <TableCell>
                              <Badge variant={order.direction?.toUpperCase() === "BUY" ? "default" : "secondary"}>
                                {order.direction?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.volume}</TableCell>
                            <TableCell className="font-mono">
                              {order.entry_price?.toFixed(5) || "-"}
                            </TableCell>
                            <TableCell className="font-mono">
                              {exitPrice?.toFixed(5) || "-"}
                            </TableCell>
                            <TableCell>
                              {pnl !== null ? (
                                <span className={pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                                  {formatPnL(pnl, "USD")}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {closedDate ? new Date(closedDate).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => hideClosedOrderMutation.mutate(String(order.order_id))}
                                disabled={hideClosedOrderMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                {t('corporateDashboard.delete')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                  {t('corporateDashboard.cancelledFailedOrders')}
                </CardTitle>
                <CardDescription>
                  {cancelledOrders.length + failedOrders.length} {cancelledOrders.length + failedOrders.length !== 1 ? t('corporateDashboard.ordersInHistoryPlural') : t('corporateDashboard.ordersInHistory')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cancelledOrders.length === 0 && failedOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <XCircle className="w-12 h-12 mb-4 opacity-20" />
                    <p>{t('corporateDashboard.noCancelledOrFailed')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('corporateDashboard.id')}</TableHead>
                        <TableHead>{t('corporateDashboard.symbol')}</TableHead>
                        <TableHead>{t('corporateDashboard.direction')}</TableHead>
                        <TableHead>{t('corporateDashboard.volume')}</TableHead>
                        <TableHead>{t('corporateDashboard.status')}</TableHead>
                        <TableHead>{t('corporateDashboard.paymentDate')}</TableHead>
                        <TableHead>{t('corporateDashboard.date')}</TableHead>
                        <TableHead>{t('corporateDashboard.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...cancelledOrders, ...failedOrders].map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.id}</TableCell>
                          <TableCell>{order.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={order.direction?.toUpperCase() === "BUY" ? "default" : "secondary"}>
                              {order.direction?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.volume}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "cancelled" ? "outline" : "destructive"}>
                              {order.status === "cancelled" ? t('corporateDashboard.cancelled') : t('corporateDashboard.failed')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.paymentDate ? new Date(order.paymentDate).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deletePendingMutation.mutate(order.id)}
                              disabled={deletePendingMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              {t('corporateDashboard.delete')}
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
        </Tabs>
      </main>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('corporateDashboard.closePosition')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('corporateDashboard.confirmClosePosition')}
              {orderToClose && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>{t('corporateDashboard.orderId')}:</span>
                    <span className="font-mono">{orderToClose.order_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('corporateDashboard.symbol')}:</span>
                    <span>{orderToClose.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('corporateDashboard.direction')}:</span>
                    <span>{orderToClose.direction?.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('corporateDashboard.volume')}:</span>
                    <span>{orderToClose.volume}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('corporateDashboard.entryPrice')}:</span>
                    <span className="font-mono">{orderToClose.entry_price?.toFixed(5)}</span>
                  </div>
                  {orderToClose.unrealized_pnl !== undefined && orderToClose.unrealized_pnl !== null && (
                    <div className="flex justify-between">
                      <span>{t('corporateDashboard.currentPnl')}:</span>
                      <span className={orderToClose.unrealized_pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                        ${orderToClose.unrealized_pnl.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('corporateDashboard.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCloseOrder}
              disabled={closeOrderMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {closeOrderMutation.isPending ? t('corporateDashboard.closing') : t('corporateDashboard.closePosition')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
