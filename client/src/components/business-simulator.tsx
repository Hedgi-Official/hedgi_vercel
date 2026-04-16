import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Play,
  DollarSign,
  Activity,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

export interface BrokerQuote {
  broker: string;
  bid: number;
  ask: number;
  total_cost_quote: number;
  spread_cost_quote: number;
  swap_cost_quote: number;
  total_cost_base: number;
  spread_cost_base: number;
  swap_cost_base: number;
  recommended: boolean;
  savings_vs_worst: number;
  market_open: boolean;
}

export interface LegData {
  leg_number: number;
  symbol: string;
  direction: string;
  volume: number;
  base_currency: string;
  quote_currency: string;
  best_broker: string;
  brokers: BrokerQuote[];
  data_source: string;
}

export interface CrossHedgeSummary {
  total_cost_quote: number;
  total_cost_base: number;
  recommended_execution: {
    leg_number: number;
    symbol: string;
    broker: string;
    direction: string;
    volume: number;
  }[];
}

export interface SimulateResponse {
  symbol: string;
  direction: string;
  volume: number;
  duration_days: number;
  best_broker: string;
  brokers?: BrokerQuote[];
  operations_required?: number;
  base_currency?: string;
  quote_currency?: string;
  synthetic_rate?: number;
  breakeven_rate?: number;
  percentage?: number;
  usd_cost?: number;
  legs?: LegData[];
  summary?: CrossHedgeSummary;
  data_source?: string;
}

export interface SimulateForm {
  symbol: string;
  direction: string;
  volume: string;
  duration_days: string;
}

export interface CreateOrderPayload {
  symbol: string;
  direction: string;
  volume: number;
  duration_days: number;
  broker?: string;
}

export interface BusinessSimulatorHandle {
  setForm: (updates: Partial<SimulateForm>) => void;
  reset: () => void;
}

interface BusinessSimulatorProps {
  /**
   * Endpoint that handles the simulate POST. Default is the public proxy
   * `/api/hedgi/quotes/simulate-public` which forwards to api.hedgi.ai
   * without auth. Authed dashboards should pass `/api/hedgi/quotes/simulate`
   * which attaches the user's Bearer token server-side.
   */
  endpoint?: string;
  /**
   * When true, renders the Create Order button below the result; the parent
   * is expected to handle the onCreateOrder callback. Off on marketing embeds.
   */
  showCreateOrderButton?: boolean;
  onCreateOrder?: (payload: CreateOrderPayload) => void;
  isCreatingOrder?: boolean;
}

function getBaseCurrency(symbol: string, apiBaseCurrency?: string): string {
  if (apiBaseCurrency) return apiBaseCurrency;
  return symbol.substring(0, 3);
}

function getQuoteCurrency(symbol: string, apiQuoteCurrency?: string): string {
  if (apiQuoteCurrency) return apiQuoteCurrency;
  return symbol.substring(3);
}

export const BusinessSimulator = React.forwardRef<BusinessSimulatorHandle, BusinessSimulatorProps>(
  function BusinessSimulator(
    {
      endpoint = "/api/hedgi/quotes/simulate-public",
      showCreateOrderButton = false,
      onCreateOrder,
      isCreatingOrder = false,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const { toast } = useToast();

    const [simulateForm, setSimulateForm] = React.useState<SimulateForm>({
      symbol: "USDBRL",
      direction: "buy",
      volume: "0.1",
      duration_days: "7",
    });
    const [simulateResult, setSimulateResult] = React.useState<SimulateResponse | null>(null);
    const [selectedBroker, setSelectedBroker] = React.useState<string | null>(null);

    React.useImperativeHandle(ref, () => ({
      setForm: (updates) => setSimulateForm((prev) => ({ ...prev, ...updates })),
      reset: () => {
        setSimulateResult(null);
        setSelectedBroker(null);
      },
    }));

    const simulateMutation = useMutation({
      mutationFn: async (data: SimulateForm) => {
        const res = await fetch(endpoint, {
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
          const error = await res.json().catch(() => ({} as any));
          const errorMsg =
            error.error ||
            (Array.isArray(error.detail)
              ? error.detail.map((d: any) => d.msg).join(", ")
              : error.detail) ||
            "Simulation failed";
          throw new Error(errorMsg);
        }
        return res.json() as Promise<SimulateResponse>;
      },
      onSuccess: (data) => {
        setSimulateResult(data);
        setSelectedBroker(data.best_broker);
      },
      onError: (error: Error) => {
        toast({
          variant: "destructive",
          title: t("corporateDashboard.simulationFailed"),
          description: error.message,
        });
      },
    });

    const handleSimulate = (e: React.FormEvent) => {
      e.preventDefault();
      simulateMutation.mutate(simulateForm);
    };

    const handleExecute = () => {
      if (!onCreateOrder) return;
      const broker = selectedBroker || simulateResult?.best_broker;
      onCreateOrder({
        symbol: simulateForm.symbol,
        direction: simulateForm.direction.toLowerCase(),
        volume: parseFloat(simulateForm.volume),
        duration_days: parseInt(simulateForm.duration_days),
        ...(broker ? { broker } : {}),
      });
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulate form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t("corporateDashboard.simulateHedge")}
            </CardTitle>
            <CardDescription>
              {t("corporateDashboard.previewCosts")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSimulate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bs-symbol">{t("corporateDashboard.currencyPair")}</Label>
                  <Select
                    value={simulateForm.symbol}
                    onValueChange={(v) => setSimulateForm((f) => ({ ...f, symbol: v }))}
                  >
                    <SelectTrigger id="bs-symbol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDBRL">USD/BRL</SelectItem>
                      <SelectItem value="EURBRL">EUR/BRL</SelectItem>
                      <SelectItem value="GBPBRL">GBP/BRL</SelectItem>
                      <SelectItem value="JPYBRL">JPY/BRL</SelectItem>
                      <SelectItem value="CNHBRL">CNH/BRL</SelectItem>
                      <SelectItem value="USDMXN">USD/MXN</SelectItem>
                      <SelectItem value="EURUSD">EUR/USD</SelectItem>
                      <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                      <SelectItem value="USDJPY">USD/JPY</SelectItem>
                      <SelectItem value="USDCNH">USD/CNH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bs-direction">{t("corporateDashboard.direction")}</Label>
                  <Select
                    value={simulateForm.direction}
                    onValueChange={(v) => setSimulateForm((f) => ({ ...f, direction: v }))}
                  >
                    <SelectTrigger id="bs-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">{t("corporateDashboard.buyLong")}</SelectItem>
                      <SelectItem value="sell">{t("corporateDashboard.sellShort")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bs-volume">{t("corporateDashboard.volumeLots")}</Label>
                  <Input
                    id="bs-volume"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={simulateForm.volume}
                    onChange={(e) => setSimulateForm((f) => ({ ...f, volume: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bs-duration">{t("corporateDashboard.durationDays")}</Label>
                  <Input
                    id="bs-duration"
                    type="number"
                    min="1"
                    max="365"
                    value={simulateForm.duration_days}
                    onChange={(e) => setSimulateForm((f) => ({ ...f, duration_days: e.target.value }))}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={simulateMutation.isPending}>
                {simulateMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t("corporateDashboard.simulating")}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {t("corporateDashboard.simulate")}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quote result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {t("corporateDashboard.quoteResult")}
            </CardTitle>
            <CardDescription>
              {simulateResult
                ? t("corporateDashboard.simulateSummary", {
                    symbol: simulateResult.symbol,
                    direction: simulateResult.direction.toUpperCase(),
                    volume: simulateResult.volume,
                    days: simulateResult.duration_days,
                  })
                : t("corporateDashboard.runSimulation")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simulateResult ? (
              <div className="space-y-4">
                {simulateResult.operations_required === 2 && simulateResult.legs ? (
                  <>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">{t("corporateDashboard.crossHedge")}</span>
                        <Badge variant="secondary" className="ml-auto">{simulateResult.best_broker}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.syntheticRate")}</span>
                          <p className="font-mono font-bold text-lg">{simulateResult.synthetic_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenRate")}</span>
                          <p className="font-mono font-bold text-lg">{simulateResult.breakeven_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.totalCost")}</span>
                          <p className="font-mono font-bold text-lg text-primary">${simulateResult.usd_cost?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenDelta")}</span>
                          <p className="font-mono font-bold text-lg text-amber-500">+{simulateResult.percentage?.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {simulateResult.legs.map((leg) => {
                        const bestBroker = leg.brokers.find((b) => b.recommended) || leg.brokers[0];
                        const baseCurrency = leg.base_currency;
                        const quoteCurrency = leg.quote_currency;

                        // Prioritize USD: determine which field contains USD values
                        const usdIsBase = baseCurrency === "USD";
                        const usdIsQuote = quoteCurrency === "USD";
                        const otherCurrency = usdIsBase ? quoteCurrency : baseCurrency;

                        const getPrimaryCost = (broker: BrokerQuote, field: "spread" | "swap" | "total") => {
                          if (usdIsBase) return broker[`${field}_cost_base` as keyof BrokerQuote] as number;
                          if (usdIsQuote) return broker[`${field}_cost_quote` as keyof BrokerQuote] as number;
                          return broker[`${field}_cost_base` as keyof BrokerQuote] as number;
                        };
                        const getSecondaryCost = (broker: BrokerQuote, field: "spread" | "swap" | "total") => {
                          if (usdIsBase) return broker[`${field}_cost_quote` as keyof BrokerQuote] as number;
                          if (usdIsQuote) return broker[`${field}_cost_base` as keyof BrokerQuote] as number;
                          return broker[`${field}_cost_quote` as keyof BrokerQuote] as number;
                        };

                        return (
                          <div key={leg.leg_number} className="p-4 bg-muted/30 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Leg {leg.leg_number}</Badge>
                                <span className="font-medium">{leg.symbol}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {leg.direction.toUpperCase()} {leg.volume}
                              </Badge>
                            </div>

                            {bestBroker && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{t("corporateDashboard.recommendedBroker")}</span>
                                  <Badge variant="secondary">{bestBroker.broker}</Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t("corporateDashboard.bidAsk")}</span>
                                    <p className="font-mono text-sm">
                                      {bestBroker.bid?.toFixed(5)} / {bestBroker.ask?.toFixed(5)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t("corporateDashboard.spreadCost")}</span>
                                    <p className="font-mono text-sm">${getPrimaryCost(bestBroker, "spread")?.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ({getSecondaryCost(bestBroker, "spread")?.toFixed(2)} {otherCurrency})
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t("corporateDashboard.swapCost")}</span>
                                    <p className="font-mono text-sm">${getPrimaryCost(bestBroker, "swap")?.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ({getSecondaryCost(bestBroker, "swap")?.toFixed(2)} {otherCurrency})
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t("corporateDashboard.totalCost")}</span>
                                    <p className="font-mono text-sm font-bold text-primary">${getPrimaryCost(bestBroker, "total")?.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ({getSecondaryCost(bestBroker, "total")?.toFixed(2)} {otherCurrency})
                                    </p>
                                  </div>
                                </div>

                                {leg.brokers.length > 1 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <p className="text-xs text-muted-foreground mb-1">{t("corporateDashboard.allBrokers")}</p>
                                    <div className="space-y-1">
                                      {leg.brokers.map((broker, i) => (
                                        <div
                                          key={i}
                                          className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                                            broker.market_open
                                              ? broker.recommended
                                                ? "bg-emerald-500/10"
                                                : "bg-muted/50"
                                              : "bg-muted/20 opacity-50"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1">
                                            <span>{broker.broker}</span>
                                            {broker.recommended && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                          </div>
                                          <span className="font-mono">${getPrimaryCost(broker, "total")?.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : simulateResult.brokers ? (
                  <>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">{t("corporateDashboard.directHedge")}</span>
                        <Badge variant="secondary" className="ml-auto">{simulateResult.best_broker}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.currentRate")}</span>
                          <p className="font-mono font-bold text-lg">{simulateResult.synthetic_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenRate")}</span>
                          <p className="font-mono font-bold text-lg">{simulateResult.breakeven_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.totalCost")}</span>
                          <p className="font-mono font-bold text-lg text-primary">${simulateResult.usd_cost?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenDelta")}</span>
                          <p className="font-mono font-bold text-lg text-amber-500">+{simulateResult.percentage?.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const bestBroker =
                        simulateResult.brokers.find((b) => b.recommended) || simulateResult.brokers[0];
                      const baseCurrency = getBaseCurrency(simulateResult.symbol, simulateResult.base_currency);
                      const quoteCurrency = getQuoteCurrency(simulateResult.symbol, simulateResult.quote_currency);

                      return bestBroker ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">{t("corporateDashboard.recommendedBroker")}</span>
                            <Badge variant="secondary">{bestBroker.broker}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t("corporateDashboard.bidAsk")}</span>
                              <p className="font-mono font-bold">
                                {bestBroker.bid?.toFixed(5)} / {bestBroker.ask?.toFixed(5)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("corporateDashboard.spreadCost")}</span>
                              <p className="font-mono font-bold">
                                {bestBroker.spread_cost_base?.toFixed(2)} {baseCurrency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ({bestBroker.spread_cost_quote?.toFixed(2)} {quoteCurrency})
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("corporateDashboard.swapCost")}</span>
                              <p className="font-mono">
                                {bestBroker.swap_cost_base?.toFixed(2)} {baseCurrency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ({bestBroker.swap_cost_quote?.toFixed(2)} {quoteCurrency})
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("corporateDashboard.totalCost")}</span>
                              <p className="font-mono font-bold text-primary">
                                {bestBroker.total_cost_base?.toFixed(2)} {baseCurrency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ({bestBroker.total_cost_quote?.toFixed(2)} {quoteCurrency})
                              </p>
                            </div>
                          </div>
                          {bestBroker.savings_vs_worst > 0 && (
                            <div className="mt-2 text-xs text-emerald-600">
                              {t("corporateDashboard.savesVsWorstBroker", {
                                amount: `${bestBroker.savings_vs_worst?.toFixed(2)} ${quoteCurrency}`,
                              })}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {simulateResult.brokers && simulateResult.brokers.length > 1 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t("corporateDashboard.selectBroker")}</h4>
                        <div className="space-y-2">
                          {simulateResult.brokers.map((broker, i) => {
                            const baseCurrency = getBaseCurrency(simulateResult.symbol, simulateResult.base_currency);
                            const isSelected = selectedBroker === broker.broker;
                            const isClickable = broker.market_open;
                            return (
                              <div
                                key={i}
                                onClick={() => isClickable && setSelectedBroker(broker.broker)}
                                className={`flex items-center justify-between p-3 rounded-lg text-sm transition-all ${
                                  !broker.market_open
                                    ? "bg-muted/20 opacity-50 cursor-not-allowed"
                                    : isSelected
                                      ? "bg-primary/10 border-2 border-primary cursor-pointer ring-2 ring-primary/20"
                                      : "bg-muted/50 border border-transparent hover:border-muted-foreground/20 cursor-pointer hover:bg-muted"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                                    }`}
                                  >
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                  <span className={isSelected ? "font-medium" : ""}>{broker.broker}</span>
                                  {broker.recommended && (
                                    <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                                      {t("corporateDashboard.best")}
                                    </Badge>
                                  )}
                                  {!broker.market_open && (
                                    <Badge variant="destructive" className="text-xs">
                                      {t("corporateDashboard.closed")}
                                    </Badge>
                                  )}
                                </div>
                                <span className={`font-mono ${isSelected ? "font-bold text-primary" : ""}`}>
                                  {broker.total_cost_base?.toFixed(2)} {baseCurrency}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t("corporateDashboard.clickToSelectBroker")}
                        </p>
                      </div>
                    )}
                  </>
                ) : null}

                {showCreateOrderButton && onCreateOrder && (
                  <Button onClick={handleExecute} className="w-full" disabled={isCreatingOrder}>
                    {isCreatingOrder ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {t("corporateDashboard.executing")}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {selectedBroker
                          ? t("corporateDashboard.executeWithBroker", { broker: selectedBroker })
                          : t("corporateDashboard.executeOrder")}
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                <p>{t("corporateDashboard.noSimulationResults")}</p>
                <p className="text-sm">{t("corporateDashboard.fillFormAndSimulate")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
);
