import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { simulateHedge, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency-api';
import { CurrencyChart } from './currency-chart';
import { calculateBusinessDays } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useActivTradesRate } from '@/hooks/use-activtrades-rate';
import type { Hedge } from '@db/schema';
import { DollarSign, ArrowUpDown, Clock, TrendingUp, BarChart2, Briefcase, Users, Globe } from 'lucide-react';

interface Props {
  showGraph?: boolean;
  onPlaceHedge?: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onOrdersUpdated?: () => void;
}

export function EnhancedCurrencySimulator({ showGraph = true, onPlaceHedge, onOrdersUpdated }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('BRL');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isPlacingHedge, setIsPlacingHedge] = useState(false);
  const [hedgeError, setHedgeError] = useState<string | null>(null);

  // Get rates from ActivTrades API
  const { data: activTradesRate, isLoading: isLoadingRate } = useActivTradesRate(`${targetCurrency}${baseCurrency}`);

  const handleSimulate = async () => {
    const currencyPair = `${targetCurrency}${baseCurrency}`;

    let currentRate;
    let swapValues;
    
    // Use the rates from ActivTrades API
    if (activTradesRate) {
      currentRate = {
        bid: activTradesRate.bid,
        ask: activTradesRate.ask
      };
      swapValues = {
        swapLong: activTradesRate.swap_long,
        swapShort: activTradesRate.swap_short
      };
      console.log('[EnhancedCurrencySimulator] Using ActivTrades rates:', currentRate);
      console.log('[EnhancedCurrencySimulator] Using ActivTrades swap values:', swapValues);
    }

    const result = await simulateHedge(
      baseCurrency,
      targetCurrency,
      amount,
      duration,
      tradeDirection
    );

    const businessDays = calculateBusinessDays(new Date(), duration);

    let hedgeCost = 0;
    if (currentRate && swapValues) {
      const { bid, ask } = currentRate;
      const { swapLong, swapShort } = swapValues;
      const spreadCost = (ask - bid) * amount;

      if (tradeDirection === 'buy') {
        hedgeCost = (businessDays * (Math.abs(swapLong) / bid) * (amount / 10)) * ask + spreadCost;
      } else {
        hedgeCost = (businessDays * (Math.abs(swapShort) / bid) * (amount / 10)) * ask + spreadCost;
      }
    }

    const costPercentage = currentRate ? (hedgeCost / amount / currentRate.bid) * 100 : 0;

    // Calculate break-even rate - when buying, the rate needs to drop by costPercentage to break even
    // When selling, the rate needs to rise by costPercentage to break even
    const breakEvenRate = tradeDirection === 'sell' ?
      currentRate ? currentRate.bid * (1 + costPercentage / 100) : 
      result.rate * (1 + costPercentage / 100) :
      currentRate ? currentRate.ask * (1 - costPercentage / 100) :
      result.rate * (1 - costPercentage / 100);

    setSimulation({
      ...result,
      businessDays,
      costDetails: {
        ...result.costDetails,
        hedgeCost
      },
      rate: currentRate ? (tradeDirection === 'buy' ? currentRate.ask : currentRate.bid) : result.rate,
      breakEvenRate
    });
  };

  const handlePlaceHedge = async () => {
    if (!onPlaceHedge || !simulation || !onOrdersUpdated) {
      console.error('Missing required callbacks or simulation data');
      return;
    }

    console.log('[CurrencySimulator] Starting hedge placement...');
    setIsPlacingHedge(true);
    setHedgeError(null);

    try {
      // Ensure proper formatting for the server API
      const hedgeData = {
        baseCurrency,
        targetCurrency,
        amount: amount.toString(), // String for consistent DB handling
        rate: simulation.rate.toString(),
        duration,
        tradeDirection, // 'buy' or 'sell'
        tradeOrderNumber: null,
        tradeStatus: null
      };

      console.log('[CurrencySimulator] Sending hedge data:', hedgeData);

      // Call the parent component's handler and await completion
      const result = await onPlaceHedge(hedgeData);
      console.log('[CurrencySimulator] Hedge placement result:', result);

      // Refresh the orders list in the dashboard
      onOrdersUpdated();

      console.log('[CurrencySimulator] Hedge placement completed successfully');
    } catch (error) {
      console.error('[CurrencySimulator] Error placing hedge:', error);
      setHedgeError(error instanceof Error ? error.message : 'Failed to place hedge');
    } finally {
      setIsPlacingHedge(false);
    }
  };

  const getTradeDirectionHelp = () => {
    if (tradeDirection === 'buy') {
      return `I will make a payment in ${targetCurrency} in the future`;
    }
    return `I will receive ${targetCurrency} and convert to ${baseCurrency} in the future`;
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="w-full max-w-2xl mx-auto bg-background shadow-lg relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            {t('simulator.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 cursor-pointer">
                  <label className="text-sm font-medium flex items-center">
                    <Globe className="mr-2 h-5 w-5 text-primary" />
                    {t('simulator.targetCurrency')}
                  </label>
                  <Select
                    value={targetCurrency}
                    onValueChange={(value) => setTargetCurrency(value as SupportedCurrency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem
                          key={currency}
                          value={currency}
                          disabled={currency === baseCurrency}
                        >
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" sideOffset={8} className="p-4 max-w-sm bg-background border border-primary/20 animate-in zoom-in-95 duration-100">
                <div className="flex flex-col items-center text-center">
                  <Globe className="h-10 w-10 text-primary mb-2" />
                  <h3 className="font-bold text-lg mb-1">Target Currency</h3>
                  <p>This is the currency you want to hedge. For example, if you're worried about USD getting more expensive, select USD here.</p>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 cursor-pointer">
                  <label className="text-sm font-medium flex items-center">
                    <Briefcase className="mr-2 h-5 w-5 text-primary" />
                    {t('simulator.baseCurrency')}
                  </label>
                  <Select
                    value={baseCurrency}
                    onValueChange={(value) => setBaseCurrency(value as SupportedCurrency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem
                          key={currency}
                          value={currency}
                          disabled={currency === targetCurrency}
                        >
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" sideOffset={8} className="p-4 max-w-sm bg-background border border-primary/20 animate-in zoom-in-95 duration-100">
                <div className="flex flex-col items-center text-center">
                  <Briefcase className="h-10 w-10 text-primary mb-2" />
                  <h3 className="font-bold text-lg mb-1">Base Currency</h3>
                  <p>This is your domestic or preferred currency. For example, if you're based in Brazil and concerned about USD getting more expensive relative to BRL, choose BRL as your base currency.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-pointer">
                <label className="text-sm font-medium flex items-center">
                  <ArrowUpDown className="mr-2 h-5 w-5 text-primary" />
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
            </TooltipTrigger>
            <TooltipContent side="right" align="center" sideOffset={8} className="p-4 max-w-sm bg-background border border-primary/20 animate-in zoom-in-95 duration-100">
              <div className="flex flex-col items-center text-center">
                <ArrowUpDown className="h-10 w-10 text-primary mb-2" />
                <h3 className="font-bold text-lg mb-1">Trade Direction</h3>
                <p>
                  <strong>Buy {targetCurrency}:</strong> Select this if you'll need to purchase {targetCurrency} in the future and want to protect against it becoming more expensive.
                  <br /><br />
                  <strong>Sell {targetCurrency}:</strong> Select this if you'll receive {targetCurrency} in the future and want to protect against it becoming less valuable.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-pointer">
                <label className="text-sm font-medium flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-primary" />
                  {t('simulator.amount')} {targetCurrency}
                </label>
                <Input
                    type="text"
                    value={amount ? amount.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                      useGrouping: true
                    }) : ''}
                    onChange={(e) => {
                      // Remove all non-numeric characters
                      const numericValue = e.target.value.replace(/[^\d]/g, '');
                      // Convert to number or default to 0 if no input
                      const numValue = numericValue ? parseInt(numericValue, 10) : 0;
                      // Update state
                      setAmount(numValue);
                    }}
                    min={1000}
                    max={1000000}
                    placeholder={t('simulator.amountField')}
                  />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={8} className="p-4 max-w-sm bg-background border border-primary/20 animate-in zoom-in-95 duration-100">
              <div className="flex flex-col items-center text-center">
                <DollarSign className="h-10 w-10 text-primary mb-2" />
                <h3 className="font-bold text-lg mb-1">Amount to Hedge</h3>
                <p>
                  Enter the amount of {targetCurrency} you want to protect. This is the total value of your future transaction that you want to hedge against currency fluctuations.
                  <br /><br />
                  For example, if you need to make a $50,000 USD payment in 3 months, enter 50000 here.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-pointer pb-2">
                <label className="text-sm font-medium flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  {t('simulator.durationLabel').replace('{days}', duration.toString())}
                </label>
                <Slider
                  value={[duration]}
                  onValueChange={([value]) => setDuration(value)}
                  max={30}
                  step={1}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={8} alignOffset={0} className="p-4 max-w-sm bg-background border border-primary/20 animate-in zoom-in-95 duration-100">
              <div className="flex flex-col items-center text-center">
                <Clock className="h-10 w-10 text-primary mb-2" />
                <h3 className="font-bold text-lg mb-1">Hedge Duration</h3>
                <p>
                  The number of days until your future transaction will occur. This determines how long your currency hedge will be active.
                  <br /><br />
                  Longer durations typically mean higher hedging costs but provide protection for a longer period.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Button onClick={handleSimulate} className="w-full">
            {t('simulator.calculateCost')}
          </Button>

          {simulation && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
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
                      // For display purposes, use the actual simulation rate
                      const currentRate = simulation.rate;
                      // When buying, breakEvenRate < currentRate, so this should be negative (price needs to drop)
                      // When selling, breakEvenRate > currentRate, so this should be positive (price needs to rise)
                      const percentDiff = ((simulation.breakEvenRate - currentRate) / currentRate) * 100;
                      return `(${percentDiff >= 0 ? '+' : ''}${percentDiff.toFixed(2)}%)`;
                    })()}
                  </p>
                </div>
              </div>

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



              {onPlaceHedge && (
                <Button
                  onClick={handlePlaceHedge}
                  className="w-full"
                  variant="outline"
                  disabled={isPlacingHedge}
                >
                  {isPlacingHedge ? t('common.placingHedge') : t('simulator.placeHedge')}
                  {hedgeError && (
                    <span className="ml-2 text-red-500">
                      {hedgeError}
                    </span>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface SimulationResult {
  rate: number;
  breakEvenRate: number;
  totalCost: number;
  hedgedAmount: number;
  costDetails: {
    costPercentage: number;
    hedgeCost: number;
  };
  businessDays: number;
  historicalRates: Array<{
    date: string;
    rate: number;
  }>;
}