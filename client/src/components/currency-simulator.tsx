import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { simulateHedge, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency-api';
import { calculateBusinessDays, countWednesdaysInNextDays, calculateBusinessDaysBetweenDates, countWednesdaysBetweenDates, getDaysBetweenDates, getMinimumHedgeDate } from '@/lib/utils';
import { useActivTradesRate } from '@/hooks/use-activtrades-rate';
import type { Hedge } from '@db/schema';
import { DollarSign, ArrowUpDown, Clock, BarChart2, Briefcase, Globe } from 'lucide-react';
import { isSyntheticPair, getSyntheticConfig, formatPairForBackend, formatPairDisplay } from '@/lib/synthetic-pairs';


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
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    () => {
      const date = new Date();
      date.setDate(date.getDate() + 7); // Default to 7 days from now
      return date;
    }
  );
  // Lock base currency to BRL, only allow USD or CNY as target
  const baseCurrency = 'BRL' as const;
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [margin, setMargin] = useState<number | null>(null);
  const [marginInput, setMarginInput] = useState<string>('');
  const [isPlacingHedge, setIsPlacingHedge] = useState(false);
  const [hedgeError, setHedgeError] = useState<string | null>(null);

  
  const pairDisplay = formatPairDisplay(baseCurrency, targetCurrency);
  const isSynthetic = isSyntheticPair(pairDisplay);
  const syntheticConfig = isSynthetic ? getSyntheticConfig(pairDisplay) : null;

  // For synthetic pairs, fetch rates for both legs
  const leg1Symbol = syntheticConfig ? formatPairForBackend(syntheticConfig.legs[0]) : `${targetCurrency}${baseCurrency}`;
  const leg2Symbol = syntheticConfig ? formatPairForBackend(syntheticConfig.legs[1]) : null;
  
  const { data: leg1Rate } = useActivTradesRate(leg1Symbol);
  const { data: leg2RateRaw } = useActivTradesRate(leg2Symbol || 'USDBRL');
  
  // Fallback rates for pairs not supported by broker API
  const FALLBACK_RATES: Record<string, { bid: number; ask: number; swap_long: number; swap_short: number }> = {
    'USDCNY': { bid: 7.24, ask: 7.26, swap_long: -5, swap_short: 2 },
  };
  
  // Use fallback if leg2Rate has invalid data (bid/ask are 0 or missing)
  const leg2Rate = (leg2Symbol && leg2RateRaw && (leg2RateRaw.bid === 0 || leg2RateRaw.ask === 0))
    ? { ...FALLBACK_RATES[leg2Symbol] || leg2RateRaw, symbol: leg2Symbol, broker: 'fallback' }
    : leg2RateRaw;
  
  // For regular pairs, use leg1Rate as activTradesRate. For synthetic, we'll compute combined rate
  const activTradesRate = isSynthetic ? null : leg1Rate;

  const handleSimulate = async () => {
    if (!expirationDate) {
      console.error('No expiration date selected');
      return;
    }

    const today = new Date();
    const duration = getDaysBetweenDates(today, expirationDate);
    const wednesdays = countWednesdaysBetweenDates(today, expirationDate);
    const businessDays = calculateBusinessDaysBetweenDates(today, expirationDate);

    let currentRate, swapValues, hedgeCost = 0;

    if (isSynthetic && leg1Rate && leg2Rate) {
      // For synthetic pairs, calculate combined rate and cost from both legs
      // We're trading USDBRL and USDCNY to create synthetic BRL/CNY
      // USDBRL: 1 USD = 5.3 BRL (bid=5.33, ask=5.34)
      // USDCNY: 1 USD = 7.25 CNY (bid=7.24, ask=7.26)
      // To get BRL/CNY (how many BRL per 1 CNY):
      // If 1 USD = 5.3 BRL and 1 USD = 7.25 CNY
      // Then 7.25 CNY = 5.3 BRL
      // So 1 CNY = 5.3 / 7.25 = 0.73 BRL
      // BRL/CNY = USDBRL / USDCNY
      
      const syntheticBid = leg1Rate.bid / leg2Rate.ask; // Use bid of leg1, ask of leg2 for worst case
      const syntheticAsk = leg1Rate.ask / leg2Rate.bid; // Use ask of leg1, bid of leg2 for worst case
      
      currentRate = { bid: syntheticBid, ask: syntheticAsk };
      
      // Calculate cost for each leg and sum them
      const volumeInLots = amount / 100000;
      
      // Leg 1 cost
      const leg1SpreadCost = (leg1Rate.ask - leg1Rate.bid) * amount;
      const leg1SwapCost = Math.abs(
        volumeInLots *
          (tradeDirection === 'buy' ? leg1Rate.swap_long : leg1Rate.swap_short) *
          (businessDays + wednesdays*2) * 1.1
      );
      
      // Leg 2 cost
      const leg2SpreadCost = (leg2Rate.ask - leg2Rate.bid) * amount;
      const leg2SwapCost = Math.abs(
        volumeInLots *
          (tradeDirection === 'buy' ? leg2Rate.swap_long : leg2Rate.swap_short) *
          (businessDays + wednesdays*2) * 1.1
      );
      
      // Total hedge cost is the sum of both legs
      hedgeCost = leg1SpreadCost + leg1SwapCost + leg2SpreadCost + leg2SwapCost;
      
      swapValues = { 
        swapLong: leg1Rate.swap_long + leg2Rate.swap_long, 
        swapShort: leg1Rate.swap_short + leg2Rate.swap_short 
      };
    } else if (activTradesRate) {
      // Regular pair
      currentRate = { bid: activTradesRate.bid, ask: activTradesRate.ask };
      swapValues = { swapLong: activTradesRate.swap_long, swapShort: activTradesRate.swap_short };
      
      const spreadCost = (currentRate.ask - currentRate.bid) * amount;
      const volumeInLots = amount / 100000;
      hedgeCost =
        Math.abs(
          volumeInLots *
            (tradeDirection === 'buy' ? swapValues.swapLong : swapValues.swapShort) *
            (businessDays + wednesdays*2) * 1.1
        ) + spreadCost;
    }

    // run your existing simulateHedge (fallback if no live rates)
    const result = await simulateHedge(
      baseCurrency,
      targetCurrency,
      amount,
      duration,
      tradeDirection
    );

    // break-even
    const costPct = currentRate ? (hedgeCost / amount / currentRate.bid) * 100 : 0;
    const breakEvenRate =
      tradeDirection === 'buy'
        ? (currentRate ? currentRate.ask : result.rate) * (1 + costPct / 100)
        : (currentRate ? currentRate.bid : result.rate) * (1 - costPct / 100);

    // Reset margin to default 2x hedgeCost and clear input field
    const defaultMargin = Math.round(hedgeCost * 2 * 100) / 100; // Round to nearest cent
    setMargin(defaultMargin);
    setMarginInput(''); // Clear input to show calculated default

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
  const handlePlaceHedge = async () => {
    if (!onPlaceHedge || !simulation || !onOrdersUpdated) return;
    setHedgeError(null);
    setIsPlacingHedge(true);

    try {
      const today = new Date();
      const duration = expirationDate ? getDaysBetweenDates(today, expirationDate) : 7;
      
      const hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> & { cost: string } = {
        baseCurrency,
        targetCurrency,
        amount: amount.toString(),
        rate: simulation.rate.toString(),
        duration,
        margin: margin?.toString() ?? null,
        cost: simulation.costDetails.hedgeCost.toString(), // Include hedge cost for payment calculation
        tradeDirection,
        tradeOrderNumber: null,
        tradeStatus: null,
        broker: 'activtrades'
      };

      // Call the onPlaceHedge callback to trigger the new Mercado Pago Brick payment flow
      const result = onPlaceHedge(hedgeData);
      
      // If onPlaceHedge returns a promise, wait for it
      if (result && typeof result.then === 'function') {
        await result;
      }
      
      console.log('[CurrencySimulator] Place hedge completed successfully');
    } catch (error) {
      console.error('[CurrencySimulator] Error placing hedge:', error);
      setHedgeError(error instanceof Error ? error.message : 'Failed to place hedge');
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
          <p className="text-base text-muted-foreground mt-2">
            {t('simulator.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Globe className="mr-2 h-4 w-4 text-primary" />
              {t('simulator.currencyPair')}
            </label>
            <Select
              value={targetCurrency}
              onValueChange={v => setTargetCurrency(v as SupportedCurrency)}
            >
              <SelectTrigger><SelectValue placeholder={t('simulator.selectPair')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">{t('currencyPairs.USDBRL')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                {t('simulator.buy')}
              </Button>
              <Button
                variant={tradeDirection === 'sell' ? 'default' : 'outline'}
                onClick={() => setTradeDirection('sell')}
              >
                {t('simulator.sell')}
              </Button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-primary" />
              {t('simulator.amount')} {t('simulator.multiplesOf1000')}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={(() => {
                const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
                return amount.toLocaleString(locale, { maximumFractionDigits: 0 });
              })()}
              onChange={e => {
                const raw = e.currentTarget.value.replace(/[^\d]/g, '');
                const parsed = parseInt(raw, 10);
                if (!isNaN(parsed)) setAmount(parsed);
                else if (raw === '') setAmount(0);
              }}
              onBlur={e => {
                const raw = e.currentTarget.value.replace(/[^\d]/g, '');
                const parsed = parseInt(raw, 10);
                if (isNaN(parsed) || parsed === 0) {
                  setAmount(1000);
                  return;
                }
                const snapped = Math.round(parsed / 1000) * 1000;
                setAmount(snapped || 1000);
              }}
              required
            />
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4 text-primary" />
              {t('simulator.expirationDate')}
            </label>
            <DatePicker
              value={expirationDate}
              onValueChange={setExpirationDate}
              minDate={getMinimumHedgeDate()}
              maxDate={(() => {
                const maxDate = new Date();
                maxDate.setFullYear(maxDate.getFullYear() + 1); // Maximum 1 year from now
                return maxDate;
              })()}
              placeholder={t('simulator.selectExpirationDate')}
            />
            {expirationDate && (
              <p className="text-sm text-muted-foreground">
                {t('simulator.hedgeDuration').replace('{days}', getDaysBetweenDates(new Date(), expirationDate).toString())}
              </p>
            )}
          </div>

          {/* Simulate */}
          <Button onClick={handleSimulate} className="w-full">
            {t('simulator.calculateCost')}
          </Button>

          {/* Results & Place Hedge */}
          {simulation && (
            <>
              {/* Current Rate, Break-Even Rate, and Stop Loss Rate Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('simulator.currentRate')}</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {simulation.rate.toFixed(4)} {`${targetCurrency}/${baseCurrency}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tradeDirection === 'buy' ?
                      t('simulator.buyWith').replace('{target}', targetCurrency).replace('{base}', baseCurrency) :
                      t('simulator.sellFor').replace('{target}', targetCurrency).replace('{base}', baseCurrency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('simulator.breakEvenRate')}</p>
                  <p className="text-xl md:text-2xl font-bold">
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
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stop Loss Rate</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {(() => {
                      const entryPrice = simulation.rate;
                      const currentMargin = margin !== null ? margin : (simulation.costDetails.hedgeCost * 2);
                      const volume = amount;
                      // Fix the calculation: for sell orders, add margin/volume; for buy orders, subtract margin/volume
                      const stopLossRate = tradeDirection === 'sell' ? 
                        Math.round((entryPrice + (currentMargin / volume)) * 1000000) / 1000000 :
                        Math.round((entryPrice - (currentMargin / volume)) * 1000000) / 1000000;
                      return stopLossRate.toFixed(4);
                    })()} {`${targetCurrency}/${baseCurrency}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const entryPrice = simulation.rate;
                      const currentMargin = margin !== null ? margin : (simulation.costDetails.hedgeCost * 2);
                      const volume = amount;
                      const stopLossRate = tradeDirection === 'sell' ? 
                        Math.round((entryPrice + (currentMargin / volume)) * 1000000) / 1000000 :
                        Math.round((entryPrice - (currentMargin / volume)) * 1000000) / 1000000;
                      const percentDiff = ((stopLossRate - entryPrice) / entryPrice) * 100;
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
                  {t('simulator.margin')} ({baseCurrency})
                </label>
                <div className="text-sm text-black mb-2">
                  {t('simulator.marginRecommendation')}
                </div>
                <Input
                  type="text"
                  value={marginInput || (margin ?? simulation.costDetails.hedgeCost * 2).toString()}
                  onChange={e => {
                    let value = e.target.value;
                    
                    // Allow only numbers and decimal point
                    value = value.replace(/[^\d.]/g, '');
                    
                    // Remove leading zeros except when followed by decimal point
                    if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
                      value = value.replace(/^0+/, '');
                    }
                    
                    // Ensure only one decimal point
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    
                    setMarginInput(value);
                    
                    // Update margin state only if it's a valid number or empty
                    if (value === '') {
                      setMargin(0);
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setMargin(numValue);
                      }
                    }
                  }}
                  onBlur={e => {
                    const inputValue = parseFloat(e.target.value) || 0;
                    const minimumMargin = Math.round((simulation.costDetails.hedgeCost * 0.2) * 100) / 100;
                    const finalValue = inputValue < minimumMargin ? minimumMargin : inputValue;
                    setMargin(finalValue);
                    setMarginInput(finalValue.toFixed(2));
                  }}
                />
              </div>

              {/* Place Hedge */}
              {onPlaceHedge && (
                <Button
                  onClick={() => {
                    console.log("🖱️ [CurrencySimulator] Place Hedge button clicked");
                    handlePlaceHedge();
                  }}
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
      </>
  );
}