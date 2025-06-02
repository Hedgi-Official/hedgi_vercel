import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { simulateHedge, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency-api';
import { calculateBusinessDays } from '@/lib/utils';
import { useActivTradesRate } from '@/hooks/use-activtrades-rate';
import type { Hedge } from '@db/schema';
import { DollarSign, ArrowUpDown, Clock, BarChart2, Briefcase, Globe } from 'lucide-react';
import { MercadoPayoSDKModal } from './mercado-pago-sdk-modal';

export interface TradeResponse {
  ask: number;
  bid: number;
  comment: string;
  deal: number;
  order: number;
  price: number;
  request: any;
  request_id: number;
  retcode: number;
  retcode_external: number;
  volume: number;
  error?: string;
}

interface Props {
  showGraph?: boolean;
  onPlaceHedge?: (
    hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">,
    paymentToken?: string
  ) => Promise<TradeResponse> | void;
  onOrdersUpdated?: () => void;
}

export interface SimulationResult {
  rate: number;
  breakEvenRate: number;
  totalCost: number;
  hedgedAmount: number;
  costDetails: {
    costPercentage: number;
    hedgeCost: number;
  };
  businessDays: number;
  historicalRates: Array<{ date: string; rate: number }>;
}

export function CurrencySimulator({
  showGraph = true,
  onPlaceHedge,
  onOrdersUpdated
}: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  // Alpha launch: simplified to BRL->USD only
  const [targetCurrency] = useState<SupportedCurrency>('USD');
  const [baseCurrency] = useState<SupportedCurrency>('BRL');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');

  // Original multi-currency code (commented for alpha launch):
  // const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  // const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('BRL');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [margin, setMargin] = useState<number | null>(null);
  const [isPlacingHedge, setIsPlacingHedge] = useState(false);
  const [hedgeError, setHedgeError] = useState<string | null>(null);

  // Payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingHedgeData, setPendingHedgeData] = useState<
    Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null
  >(null);

  const { data: activTradesRate } = useActivTradesRate(`${targetCurrency}${baseCurrency}`);

  const handleSimulate = async () => {
    let currentRate, swapValues;
    if (activTradesRate) {
      currentRate = { bid: activTradesRate.bid, ask: activTradesRate.ask };
      swapValues = { swapLong: activTradesRate.swap_long, swapShort: activTradesRate.swap_short };
    }

    // run your existing simulateHedge (fallback if no live rates)
    const result = await simulateHedge(
      baseCurrency,
      targetCurrency,
      amount,
      duration,
      tradeDirection
    );

    const businessDays = calculateBusinessDays(new Date(), duration);

    // compute hedge cost
    let hedgeCost = 0;
    if (currentRate && swapValues) {
      const spreadCost = (currentRate.ask - currentRate.bid) * amount;
      const volumeInLots = amount / 100000;
      hedgeCost =
        Math.abs(
          volumeInLots *
            (tradeDirection === 'buy' ? swapValues.swapLong : swapValues.swapShort) *
            businessDays
        ) + spreadCost;
    }

    // break-even
    const costPct = currentRate ? (hedgeCost / amount / currentRate.bid) * 100 : 0;
    const breakEvenRate =
      tradeDirection === 'buy'
        ? (currentRate ? currentRate.ask : result.rate) * (1 + costPct / 100)
        : (currentRate ? currentRate.bid : result.rate) * (1 - costPct / 100);

    // default margin 2x hedgeCost
    setMargin(Math.round(hedgeCost * 2));

    setSimulation({
      ...result,
      businessDays,
      costDetails: { ...result.costDetails, hedgeCost },
      rate: currentRate
        ? tradeDirection === 'buy'
          ? currentRate.ask
          : currentRate.bid
        : result.rate,
      breakEvenRate
    });
  };

  // open payment modal
  const handlePlaceHedge = () => {
    if (!onPlaceHedge || !simulation || !onOrdersUpdated) return;
    setHedgeError(null);

    const hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> & { status: 'pending' }= {
      baseCurrency,
      targetCurrency,
      amount: amount.toString(),
      rate: simulation.rate.toString(),
      duration,
      margin: margin?.toString() ?? null,
      tradeDirection,
      tradeOrderNumber: null,
      tradeStatus: null,
      broker: 'activtrades',
      status: 'pending'
    };

    setPendingHedgeData(hedgeData);
    setIsPaymentModalOpen(true);
  };

  // after payment, call Dashboard's onPlaceHedge
  const handlePaymentSuccess = async (
    hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">,
    paymentToken?: string
  ) => {
    if (!onPlaceHedge || !onOrdersUpdated) return;
    setIsPlacingHedge(true);
    try {
      console.log('[CurrencySimulator] Payment successful, placing hedge with token:', paymentToken);
      await onPlaceHedge(hedgeData, paymentToken || 'test-payment-success');
      onOrdersUpdated();
      setIsPaymentModalOpen(false);
    } catch (err) {
      setHedgeError(err instanceof Error ? err.message : 'Failed to place hedge');
    } finally {
      setIsPlacingHedge(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto bg-background shadow-lg relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            {t('simulator.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alpha launch: BRL/USD currency selectors only */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Globe className="mr-2 h-4 w-4 text-primary" />
                {t('simulator.targetCurrency')}
              </label>
              <Select
                value={targetCurrency}
                onValueChange={() => {}} // Disabled for alpha launch
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Briefcase className="mr-2 h-4 w-4 text-primary" />
                {t('simulator.baseCurrency')}
              </label>
              <Select
                value={baseCurrency}
                onValueChange={() => {}} // Disabled for alpha launch
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Original multi-currency selectors (commented for future expansion):
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Globe className="mr-2 h-4 w-4 text-primary" />
                {t('simulator.targetCurrency')}
              </label>
              <Select
                value={targetCurrency}
                onValueChange={v => setTargetCurrency(v as SupportedCurrency)}
              >
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(c => (
                    <SelectItem key={c} value={c} disabled={c === baseCurrency}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Briefcase className="mr-2 h-4 w-4 text-primary" />
                {t('simulator.baseCurrency')}
              </label>
              <Select
                value={baseCurrency}
                onValueChange={v => setBaseCurrency(v as SupportedCurrency)}
              >
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(c => (
                    <SelectItem key={c} value={c} disabled={c === targetCurrency}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          */}

          {/* Direction */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <ArrowUpDown className="mr-2 h-4 w-4 text-primary" />
              {t('simulator.tradeDirection')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={tradeDirection === 'buy' ? 'default' : 'outline'}
                onClick={() => setTradeDirection('buy')}
              >
                {t('simulator.buy')} {targetCurrency}
              </Button>
              <Button
                variant={tradeDirection === 'sell' ? 'default' : 'outline'}
                onClick={() => setTradeDirection('sell')}
              >
                {t('simulator.sell')} {targetCurrency}
              </Button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-primary" />
              {t('simulator.amount')} {targetCurrency}
            </label>
            <Input
              type="text"
              value={amount.toLocaleString('en-US')}
              onChange={e => {
                const v = parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0;
                setAmount(v);
              }}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4 text-primary" />
              {t('simulator.durationLabel').replace('{days}', duration.toString())}
            </label>
            <Slider
              value={[duration]}
              onValueChange={([v]) => setDuration(v)}
              max={30}
              step={1}
            />
          </div>

          {/* Simulate */}
          <Button onClick={handleSimulate} className="w-full">
            {t('simulator.calculateCost')}
          </Button>

          {/* Results & Place Hedge */}
          {simulation && (
            <>
              {/* Current Rate and Break-Even Rate Display */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('simulator.currentRate')}</p>
                  <p className="text-2xl font-bold">
                    {simulation.rate.toFixed(4)} {`${targetCurrency}/${baseCurrency}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tradeDirection === 'buy' ?
                      `Buy ${targetCurrency} with ${baseCurrency}` :
                      `Sell ${targetCurrency} for ${baseCurrency}`}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('simulator.breakEvenRate')}</p>
                  <p className="text-2xl font-bold">
                    {simulation.breakEvenRate.toFixed(4)} {`${targetCurrency}/${baseCurrency}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const currentRate = tradeDirection === 'buy' ? simulation.rate : simulation.rate;
                      const percentDiff = ((simulation.breakEvenRate - currentRate) / currentRate) * 100;
                      return `(${percentDiff >= 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Hedge cost display */}
              <div className="space-y-2">
                <h3 className="font-medium">{t('simulator.hedgeDetails')}</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>{t('simulator.totalCost')}</span>
                    <span>
                      {simulation.costDetails.hedgeCost.toFixed(2)} {baseCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t('simulator.businessDays')}</span>
                    <span>{simulation.businessDays} {t('simulator.days')}</span>
                  </div>
                </div>
              </div>

              {/* Margin input */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <Briefcase className="mr-2 h-4 w-4 text-primary" />
                  Margin ({baseCurrency})
                </label>
                <Input
                  type="text"
                  value={(margin ?? simulation.costDetails.hedgeCost * 2).toFixed(2)}
                  onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Place Hedge */}
              {onPlaceHedge && (
                <Button
                  onClick={handlePlaceHedge}
                  className="w-full"
                  variant="outline"
                  disabled={isPlacingHedge}
                >
                  {isPlacingHedge
                    ? t('common.placingHedge')
                    : t('simulator.placeHedge')}
                  {hedgeError && <span className="ml-2 text-red-500">{hedgeError}</span>}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <MercadoPayoSDKModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        hedgeData={pendingHedgeData}
        currency={baseCurrency}
        simulation={simulation}
      />
    </>
  );
}