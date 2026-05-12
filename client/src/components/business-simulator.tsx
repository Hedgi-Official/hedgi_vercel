import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
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
import { DatePicker } from "@/components/ui/date-picker";
import { cn, getDaysBetweenDates } from "@/lib/utils";
import {
  RefreshCw,
  Play,
  DollarSign,
  Activity,
  CheckCircle2,
  BarChart3,
  Check,
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
  /**
   * `marketing` (default) keeps the original Volume (lots) / Buy (Long) UI
   * used on the public /business and /what-is-hedge embeds. `dashboard`
   * swaps the display layer to an Amount field with a live currency
   * prefix, dynamic Buy/Sell labels, enriched pair dropdown, duration
   * preset chips, and a reformatted quote-result summary. The API
   * payload is identical in both variants — the display layer converts
   * the typed amount back to lots before calling the endpoint. Scoped
   * this way so the change is revertable by dropping `variant="dashboard"`
   * from the call site.
   */
  variant?: "marketing" | "dashboard";
}

function getBaseCurrency(symbol: string, apiBaseCurrency?: string): string {
  if (apiBaseCurrency) return apiBaseCurrency;
  return symbol.substring(0, 3);
}

function getQuoteCurrency(symbol: string, apiQuoteCurrency?: string): string {
  if (apiQuoteCurrency) return apiQuoteCurrency;
  return symbol.substring(3);
}

// Display <-> API bridge. Dashboard users enter a currency amount
// (e.g. $10,000); the backend still expects `volume` in lots. Standard
// forex lot size is 100,000 units of the base currency, so 10,000 USD
// = 0.1 lots, matching today's default. Helpers are intentionally
// trivial and local so reverting is a one-commit rollback.
const LOT_SIZE = 100_000;

const CURRENCY_PREFIXES: Record<string, string> = {
  USD: "$",
  EUR: "€",
  BRL: "R$",
  GBP: "£",
  JPY: "¥",
  CNH: "¥",
  CNY: "¥",
  MXN: "Mex$",
};

const PAIR_NAMES: Record<string, [string, string]> = {
  USDBRL: ["US Dollar", "Brazilian Real"],
  EURBRL: ["Euro", "Brazilian Real"],
  GBPBRL: ["British Pound", "Brazilian Real"],
  JPYBRL: ["Japanese Yen", "Brazilian Real"],
  CNHBRL: ["Chinese Yuan", "Brazilian Real"],
  USDMXN: ["US Dollar", "Mexican Peso"],
  EURUSD: ["Euro", "US Dollar"],
  GBPUSD: ["British Pound", "US Dollar"],
  USDJPY: ["US Dollar", "Japanese Yen"],
  USDCNH: ["US Dollar", "Chinese Yuan"],
};

function formatPairCode(symbol: string): string {
  if (symbol.length < 6) return symbol;
  // Middle dot matches the separator register used site-wide (reassurance
  // rows, cross-link eyebrows). Applies to the Select trigger, the
  // enriched option list, and the quote-result summary line.
  return `${symbol.slice(0, 3)}·${symbol.slice(3)}`;
}

function getCurrencyPrefix(symbol: string): string {
  return CURRENCY_PREFIXES[symbol.slice(0, 3)] ?? "";
}

function formatAmountWithPrefix(symbol: string, lots: number): string {
  const prefix = getCurrencyPrefix(symbol);
  const amount = Math.round(lots * LOT_SIZE);
  return `${prefix}${amount.toLocaleString("en-US")}`;
}

export const BusinessSimulator = React.forwardRef<BusinessSimulatorHandle, BusinessSimulatorProps>(
  function BusinessSimulator(
    {
      endpoint = "/api/hedgi/quotes/simulate-public",
      showCreateOrderButton = false,
      onCreateOrder,
      isCreatingOrder = false,
      variant = "marketing",
    },
    ref,
  ) {
    const { t } = useTranslation();
    const { toast } = useToast();
    // Marketing embeds on /business and /what-is-hedge render a
    // simplified Quote Result — just the 4-metric summary band, no
    // broker breakdown, no leg cards, no Execute button. Dashboard
    // (corporate-dashboard) keeps the full breakdown because it's the
    // surface where users actually select a broker and execute.
    const isMarketing = variant === "marketing";

    const [simulateForm, setSimulateForm] = React.useState<SimulateForm>({
      symbol: "USDBRL",
      direction: "buy",
      volume: "0.1",
      duration_days: "7",
    });
    // Focus state for the Amount input — swaps between "10,000" when
    // blurred and "10000" raw digits while editing.
    const [amountFocused, setAmountFocused] = React.useState(false);

    // Date-picker derived state. `today` captured once at mount so the
    // end-date derivation is deterministic per duration_days. The API
    // payload remains `duration_days: number` — this state is purely
    // the display bridge between a calendar date and days-to-hedge.
    const today = React.useMemo(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }, []);
    const durationEndDate = React.useMemo(() => {
      const d = new Date(today);
      const days = parseInt(simulateForm.duration_days) || 7;
      d.setDate(d.getDate() + days);
      return d;
    }, [today, simulateForm.duration_days]);
    const minHedgeDate = React.useMemo(() => {
      const d = new Date(today);
      d.setDate(d.getDate() + 1); // tomorrow — can't hedge for 0 days
      return d;
    }, [today]);
    const maxHedgeDate = React.useMemo(() => {
      const d = new Date(today);
      d.setDate(d.getDate() + 365); // matches the current max=365 input
      return d;
    }, [today]);
    const handleDateChange = (date: Date | undefined) => {
      if (!date) return;
      const days = Math.max(1, getDaysBetweenDates(today, date));
      setSimulateForm((f) => ({ ...f, duration_days: String(days) }));
    };
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
              {t("corporateDashboard.previewCostsBrokers")}
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
                      {[
                        "USDBRL",
                        "EURBRL",
                        "GBPBRL",
                        "JPYBRL",
                        "CNHBRL",
                        "USDMXN",
                        "EURUSD",
                        "GBPUSD",
                        "USDJPY",
                        "USDCNH",
                      ].map((symbol) => {
                        const code = formatPairCode(symbol);
                        const names = PAIR_NAMES[symbol];
                        // Enriched dropdown option pattern. Radix's
                        // <Select.Value> in the trigger reads only the
                        // content of <Select.ItemText>, so code
                        // ("USD/BRL") renders in the trigger; the
                        // descriptive "— US Dollar · Brazilian Real"
                        // sibling span lives inside the item but
                        // outside ItemText and only shows in the
                        // expanded dropdown list.
                        if (!names) {
                          return (
                            <SelectItem key={symbol} value={symbol}>
                              {code}
                            </SelectItem>
                          );
                        }
                        return (
                          <SelectPrimitive.Item
                            key={symbol}
                            value={symbol}
                            className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          >
                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                              <SelectPrimitive.ItemIndicator>
                                <Check className="h-4 w-4" />
                              </SelectPrimitive.ItemIndicator>
                            </span>
                            <SelectPrimitive.ItemText>
                              {code}
                            </SelectPrimitive.ItemText>
                            <span className="ml-2 text-xs text-muted-foreground">
                              — {names[0]} · {names[1]}
                            </span>
                          </SelectPrimitive.Item>
                        );
                      })}
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
                      <SelectItem value="buy">
                        {t("corporateDashboard.buyCurrency", {
                          currency: simulateForm.symbol.slice(0, 3),
                        })}
                      </SelectItem>
                      <SelectItem value="sell">
                        {t("corporateDashboard.sellCurrency", {
                          currency: simulateForm.symbol.slice(0, 3),
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bs-volume">
                    {t("corporateDashboard.amountLabel")}
                  </Label>
                  {/* Amount input: currency prefix pinned inside the
                      field on the left; value is the lot volume ×
                      LOT_SIZE, formatted with commas when unfocused
                      and raw-numeric during editing. onChange converts
                      the typed amount back to lots so the underlying
                      form state (and API payload) stays on the
                      existing `volume` field. */}
                  {(() => {
                    const prefix = getCurrencyPrefix(simulateForm.symbol);
                    const lotsNum = parseFloat(simulateForm.volume) || 0;
                    const amountNum = Math.round(lotsNum * LOT_SIZE);
                    const amountStr = amountFocused
                      ? String(amountNum)
                      : amountNum.toLocaleString("en-US");
                    const leftPad =
                      prefix.length >= 3
                        ? "pl-12"
                        : prefix.length === 2
                          ? "pl-10"
                          : "pl-7";
                    return (
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {prefix}
                        </span>
                        <Input
                          id="bs-volume"
                          type="text"
                          inputMode="numeric"
                          className={leftPad}
                          value={amountStr}
                          onFocus={() => setAmountFocused(true)}
                          onBlur={() => setAmountFocused(false)}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(
                              /[^0-9]/g,
                              "",
                            );
                            const parsed = parseFloat(cleaned) || 0;
                            const lots = (parsed / LOT_SIZE).toString();
                            setSimulateForm((f) => ({ ...f, volume: lots }));
                          }}
                        />
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bs-duration">
                    {t("corporateDashboard.durationLabel")}
                  </Label>
                  {/* Date picker is the primary affordance; the chip
                      row below is a secondary quick-select. Both write
                      back to simulateForm.duration_days. Compact "MMM
                      d, yyyy" display register matches the site's
                      tabular numeric aesthetic. */}
                  <DatePicker
                    value={durationEndDate}
                    onValueChange={handleDateChange}
                    minDate={minHedgeDate}
                    maxDate={maxHedgeDate}
                    displayFormat="MMM d, yyyy"
                    className="h-10"
                  />
                  {/* !mt-1.5 overrides the parent's space-y-2 so the
                      chip row sits tighter under the date picker and
                      the pair reads as one composed input. */}
                  <div className="!mt-1.5 flex items-center justify-center gap-1.5">
                    {[7, 30, 60, 90].map((days) => {
                      const active =
                        simulateForm.duration_days === String(days);
                      return (
                        <button
                          key={days}
                          type="button"
                          onClick={() =>
                            setSimulateForm((f) => ({
                              ...f,
                              duration_days: String(days),
                            }))
                          }
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                            active
                              ? "bg-accent-navy text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/70",
                          )}
                        >
                          {days}
                        </button>
                      );
                    })}
                  </div>
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
                ? t("corporateDashboard.simulateSummaryDashboard", {
                    direction: simulateResult.direction.toUpperCase(),
                    amount: formatAmountWithPrefix(
                      simulateResult.symbol,
                      simulateResult.volume,
                    ),
                    symbol: formatPairCode(simulateResult.symbol),
                    days: simulateResult.duration_days,
                  })
                : t("corporateDashboard.runSimulation")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simulateResult ? (
              isMarketing ? (
                /* Simplified marketing Quote Result. Two-tier layout
                   leads with the Current Rate vs. Locked Rate
                   comparison — the core educational moment of
                   hedging. Total cost + Breakeven Δ become supporting
                   metrics below a divider. A closing tagline wraps up
                   the card without a second divider.
                     - First-column rate label auto-switches between
                       "Current Rate" (direct hedge) and "Synthetic
                       Rate" (cross hedge).
                     - "Locked Rate" replaces "Breakeven Rate" for
                       this non-expert audience.
                     - Sign-aware prefix on the Δ handles +/- values. */
                (() => {
                  const isCross =
                    simulateResult.operations_required === 2 &&
                    !!simulateResult.legs;
                  const leftRateLabel = isCross
                    ? t("corporateDashboard.syntheticRate")
                    : t("corporateDashboard.currentRate");
                  const pct = simulateResult.percentage ?? 0;
                  const pctPrefix = pct >= 0 ? "+" : "";
                  const days = simulateResult.duration_days;
                  return (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-6 py-8 md:px-8 md:py-10">
                      {/* Hero tier — paired rate comparison */}
                      <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-2 sm:gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                            {leftRateLabel}
                          </div>
                          <div className="num-display mt-2 text-3xl font-semibold text-foreground">
                            {simulateResult.synthetic_rate?.toFixed(5)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("corporateDashboard.marketingCurrentRateCaption")}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                            {t("corporateDashboard.marketingLockedRateLabel")}
                          </div>
                          <div className="num-display mt-2 text-3xl font-semibold text-foreground">
                            {simulateResult.breakeven_rate?.toFixed(5)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("corporateDashboard.marketingLockedRateCaption")}
                          </div>
                        </div>
                      </div>

                      <div className="my-6 h-px bg-foreground/10" />

                      {/* Supporting pair — sentence-case labels
                          (no eyebrow treatment). Mint Total cost, amber Δ. */}
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t("corporateDashboard.marketingTotalCostLabel")}
                          </div>
                          <p className="num-body mt-1 text-lg font-semibold text-primary">
                            ${simulateResult.usd_cost?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t("corporateDashboard.breakevenDeltaShort")}
                          </div>
                          <p className="num-body mt-1 text-lg font-semibold text-amber-500">
                            {pctPrefix}
                            {pct.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* Closing tagline — no separator above; sits
                          as the card's quiet foot. */}
                      <div className="mt-6 text-center text-xs text-muted-foreground">
                        {t("corporateDashboard.marketingRateLockedFooter", {
                          days,
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
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
                          <p className="num-body font-bold text-lg">{simulateResult.synthetic_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenRate")}</span>
                          <p className="num-body font-bold text-lg">{simulateResult.breakeven_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.totalCost")}</span>
                          <p className="num-body font-bold text-lg text-primary">${simulateResult.usd_cost?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenDelta")}</span>
                          <p className="num-body font-bold text-lg text-amber-500">+{simulateResult.percentage?.toFixed(2)}%</p>
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
                                    <p className="num-body text-sm">
                                      {bestBroker.bid?.toFixed(5)} / {bestBroker.ask?.toFixed(5)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t("corporateDashboard.spreadCost")}</span>
                                    <p className="num-body text-sm">${getPrimaryCost(bestBroker, "spread")?.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ({getSecondaryCost(bestBroker, "spread")?.toFixed(2)} {otherCurrency})
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t("corporateDashboard.swapCost")}</span>
                                    <p className="num-body text-sm">${getPrimaryCost(bestBroker, "swap")?.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ({getSecondaryCost(bestBroker, "swap")?.toFixed(2)} {otherCurrency})
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">{t("corporateDashboard.totalCost")}</span>
                                    <p className="num-body text-sm font-bold text-primary">${getPrimaryCost(bestBroker, "total")?.toFixed(2)}</p>
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
                                          <span className="num-body">${getPrimaryCost(broker, "total")?.toFixed(2)}</span>
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
                          <p className="num-body font-bold text-lg">{simulateResult.synthetic_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenRate")}</span>
                          <p className="num-body font-bold text-lg">{simulateResult.breakeven_rate?.toFixed(5)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.totalCost")}</span>
                          <p className="num-body font-bold text-lg text-primary">${simulateResult.usd_cost?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("corporateDashboard.breakevenDelta")}</span>
                          <p className="num-body font-bold text-lg text-amber-500">+{simulateResult.percentage?.toFixed(2)}%</p>
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
                              <p className="num-body font-bold">
                                {bestBroker.bid?.toFixed(5)} / {bestBroker.ask?.toFixed(5)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("corporateDashboard.spreadCost")}</span>
                              <p className="num-body font-bold">
                                {bestBroker.spread_cost_base?.toFixed(2)} {baseCurrency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ({bestBroker.spread_cost_quote?.toFixed(2)} {quoteCurrency})
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("corporateDashboard.swapCost")}</span>
                              <p className="num-body">
                                {bestBroker.swap_cost_base?.toFixed(2)} {baseCurrency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ({bestBroker.swap_cost_quote?.toFixed(2)} {quoteCurrency})
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("corporateDashboard.totalCost")}</span>
                              <p className="num-body font-bold text-primary">
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
                                <span className={`num-body ${isSelected ? "font-bold text-primary" : ""}`}>
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
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {t("corporateDashboard.noSimulationResults")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("corporateDashboard.fillFormAndSimulate")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
);
