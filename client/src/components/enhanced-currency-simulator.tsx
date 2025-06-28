import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { simulateHedge, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency-api';
import { CurrencyChart } from './currency-chart';
import { calculateBusinessDays } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useActivTradesRate } from '@/hooks/use-activtrades-rate';
import type { Hedge } from '@db/schema';
import { DollarSign, ArrowUpDown, Clock, TrendingUp, BarChart2, Briefcase, Users, Globe } from 'lucide-react';
// Use StandaloneWindowPayment for complete isolation from React's refresh cycle
// This opens a standalone HTML file in a new window which handles payment processing
// independently from React's refresh cycle, ensuring consistent display of payment UI
import StandaloneWindowPayment from './standalone-window-payment';

interface Props {
  showGraph?: boolean;
  onPlaceHedge?: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
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
  historicalRates: Array<{
    date: string;
    rate: number;
  }>;
}

export function EnhancedCurrencySimulator({ showGraph = true, onPlaceHedge, onOrdersUpdated }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('BRL');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [margin, setMargin] = useState<number | null>(null);
  const [marginInput, setMarginInput] = useState<string>('');
  const [isPlacingHedge, setIsPlacingHedge] = useState(false);
  const [hedgeError, setHedgeError] = useState<string | null>(null);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingHedgeData, setPendingHedgeData] = useState<Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> | null>(null);

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

      // Volume in lots (standard lot is 100,000 units)
      const volumeInLots = amount / 100000;

      // Using the formula: Cost = abs(Volume × swap_rate × Days)
      if (tradeDirection === 'buy') {
        hedgeCost = Math.abs(volumeInLots * swapLong * businessDays) + spreadCost;
      } else {
        hedgeCost = Math.abs(volumeInLots * swapShort * businessDays) + spreadCost;
      }

      console.log('[EnhancedCurrencySimulator] Calculated hedge cost:', {
        volumeInLots,
        businessDays,
        swapRate: tradeDirection === 'buy' ? swapLong : swapShort,
        spreadCost,
        totalCost: hedgeCost
      });
    }

    const costPercentage = currentRate ? (hedgeCost / amount / currentRate.bid) * 100 : 0;

    const breakEvenRate = tradeDirection === 'buy' ?
      currentRate ? currentRate.ask * (1 + costPercentage / 100) :
      result.rate * (1 + costPercentage / 100) :
      currentRate ? currentRate.bid * (1 - costPercentage / 100) :
      result.rate * (1 - costPercentage / 100);

    const simulationResult = {
      ...result,
      businessDays,
      costDetails: {
        ...result.costDetails,
        hedgeCost
      },
      rate: currentRate ? (tradeDirection === 'buy' ? currentRate.ask : currentRate.bid) : result.rate,
      breakEvenRate
    };

    // Reset margin to default 2x hedgeCost and clear input field
    const defaultMargin = Math.round(hedgeCost * 2 * 100) / 100; // Round to nearest cent
    setMargin(defaultMargin);
    setMarginInput(''); // Clear input to show calculated default

    setSimulation(simulationResult);
  };

  // Handle the initial place hedge button click to open payment modal
  const handlePlaceHedge = () => {
    if (!onPlaceHedge || !simulation || !onOrdersUpdated) {
      console.error('Missing required callbacks or simulation data');
      return;
    }

    setHedgeError(null);

    // Prepare the hedge data
    const hedgeData = {
      baseCurrency,
      targetCurrency,
      amount: amount.toString(), // String for consistent DB handling
      rate: simulation.rate.toString(),
      duration,
      margin: margin ? margin.toString() : null, // Include margin field
      tradeDirection, // 'buy' or 'sell'
      tradeOrderNumber: null,
      tradeStatus: null,
      broker: 'activtrades', // Default broker
      status: 'pending' // Initial status
    };

    console.log('[EnhancedCurrencySimulator] Opening payment modal with hedge data:', hedgeData);

    // Store the hedge data and open the payment modal
    setPendingHedgeData(hedgeData);
    setIsPaymentModalOpen(true);
  };

  // This function is called after successful payment
  const handlePaymentSuccess = async (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => {
    if (!onPlaceHedge || !onOrdersUpdated) {
      console.error('Missing required callbacks');
      return;
    }

    console.log('[EnhancedCurrencySimulator] Payment successful, placing hedge...');
    setIsPlacingHedge(true);

    try {
      // Call the parent component's handler to place the hedge after payment
      const result = await onPlaceHedge(hedgeData);
      console.log('[EnhancedCurrencySimulator] Hedge placement result:', result);

      // Refresh the orders list in the dashboard
      onOrdersUpdated();

      console.log('[EnhancedCurrencySimulator] Hedge placement completed successfully');
    } catch (error) {
      console.error('[EnhancedCurrencySimulator] Error placing hedge:', error);
      setHedgeError(error instanceof Error ? error.message : 'Failed to place hedge');
    } finally {
      setIsPlacingHedge(false);
    }
  };

  const getTradeDirectionHelp = () => {
    const buyTitle = `Buy ${targetCurrency}:`;
    const sellTitle = `Sell ${targetCurrency}:`;
    const buyText = t('simulator.tradeDirectionHelp')
      .split('\n\n')[0]
      .replace('Buy USD:', '')
      .replace('USD', targetCurrency);
    const sellText = t('simulator.tradeDirectionHelp')
      .split('\n\n')[1]
      .replace('Sell USD:', '')
      .replace('USD', targetCurrency);

    return (
      <>
        <p className="text-sm text-foreground mb-2">
          <span className="font-bold">{buyTitle}</span>{buyText}
        </p>
        <p className="text-sm text-foreground">
          <span className="font-bold">{sellTitle}</span>{sellText}
        </p>
      </>
    );
  };

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <Card className="w-full max-w-2xl mx-auto bg-background shadow-lg relative z-10 card-container">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="mr-2 h-5 w-5" />
              {t('simulator.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/*
            <div className="grid grid-cols-2 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <Globe className="mr-2 h-4 w-4 text-primary" />
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
                <TooltipContent side="bottom" className="p-0 max-w-xs">
                  <div className="bg-card rounded-lg shadow-md p-4">
                    <div className="flex flex-col items-center mb-3">
                      <Globe className="h-7 w-7 text-primary mb-2" />
                      <h4 className="font-bold text-foreground">{t('simulator.targetCurrency')}</h4>
                    </div>
                    <p className="text-sm text-foreground">
                      {t('simulator.targetCurrencyHelp')}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <Briefcase className="mr-2 h-4 w-4 text-primary" />
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
                <TooltipContent side="bottom" className="p-0 max-w-xs">
                  <div className="bg-card rounded-lg shadow-md p-4">
                    <div className="flex flex-col items-center mb-3">
                      <Briefcase className="h-7 w-7 text-primary mb-2" />
                      <h4 className="font-bold text-foreground">{t('simulator.baseCurrency')}</h4>
                    </div>
                    <p className="text-sm text-foreground">
                      {t('simulator.baseCurrencyHelp')}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            */}

            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-0 max-w-xs">
                <div className="bg-card rounded-lg shadow-md p-4">
                  <div className="flex flex-col items-center mb-3">
                    <ArrowUpDown className="h-7 w-7 text-primary mb-2" />
                    <h4 className="font-bold text-foreground">{t('simulator.tradeDirection')}</h4>
                  </div>
                  <div className="text-sm text-foreground">
                    {getTradeDirectionHelp()}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-primary" />
                    {t('simulator.amount')} {targetCurrency} {t('simulator.multiplesOf1000')}
                  </label>
                  <Input
                    type="number"
                    step={1000}
                    min={0}
                    defaultValue={amount}
                    onChange={e => {
                      const v = e.currentTarget.valueAsNumber;
                      if (!isNaN(v)) setAmount(v);
                    }}
                    onBlur={e => {
                      const raw = parseFloat(e.currentTarget.value);
                      // if they left it blank or non-numeric, revert to last valid
                      if (isNaN(raw)) {
                        e.currentTarget.value = amount.toString();
                        return;
                      }
                      // snap to nearest 1,000 (use round for closest multiple)
                      const snapped = Math.round(raw / 1000) * 1000;
                      setAmount(snapped);
                      e.currentTarget.value = snapped.toString();
                    }}
                    placeholder={t('simulator.amountField')}
                    required
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-0 max-w-xs">
                <div className="bg-card rounded-lg shadow-md p-4">
                  <div className="flex flex-col items-center mb-3">
                    <DollarSign className="h-7 w-7 text-primary mb-2" />
                    <h4 className="font-bold text-foreground">{t('simulator.amount')} {targetCurrency}</h4>
                  </div>
                  <div className="text-sm text-foreground space-y-2">
                    <p>{t('simulator.amountHelp').split('\n\n')[0]}</p>
                    <p>{t('simulator.amountHelp').split('\n\n')[1]}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 py-2">
                  <label className="text-sm font-medium flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-primary" />
                    {t('simulator.durationLabel').replace('{days}', duration.toString())}
                  </label>
                  <div className="pt-2 pb-6">
                    <Slider
                      value={[duration]}
                      onValueChange={([value]) => setDuration(value)}
                      max={30}
                      step={1}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-0 max-w-xs">
                <div className="bg-card rounded-lg shadow-md p-4">
                  <div className="flex flex-col items-center mb-3">
                    <Clock className="h-7 w-7 text-primary mb-2" />
                    <h4 className="font-bold text-foreground">{t('simulator.duration')}</h4>
                  </div>
                  <div className="text-sm text-foreground space-y-2">
                    <p>{t('simulator.durationHelp').split('\n\n')[0]}</p>
                    <p>{t('simulator.durationHelp').split('\n\n')[1]}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Button onClick={handleSimulate} className="w-full">
              {t('simulator.calculateCost')}
            </Button>

            {/* Margin field - always shown regardless of simulation */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 mt-6">
                  <label className="text-sm font-medium flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                    {t('simulator.margin')} ({baseCurrency})
                  </label>
                  <div className="text-sm text-black mb-2">
                    {t('simulator.marginRecommendation')}
                  </div>
                  <Input
                    type="text"
                    value={marginInput || (margin ?? (amount * 0.05)).toString()}
                    onChange={(e) => {
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
                    onBlur={(e) => {
                      const inputValue = parseFloat(e.target.value) || 0;
                      
                      // Calculate minimum margin (20% of hedge cost) if simulation exists
                      if (simulation) {
                        const minimumMargin = Math.round((simulation.costDetails.hedgeCost * 0.2) * 100) / 100;
                        const finalValue = inputValue < minimumMargin ? minimumMargin : inputValue;
                        setMargin(finalValue);
                        setMarginInput(finalValue.toFixed(2));
                      } else {
                        // Fallback when no simulation (use 5% of amount as before)
                        const minimumMargin = Math.round((amount * 0.05 * 0.2) * 100) / 100;
                        const finalValue = inputValue < minimumMargin ? minimumMargin : inputValue;
                        setMargin(finalValue);
                        setMarginInput(finalValue.toFixed(2));
                      }
                    }}
                    placeholder="Enter margin amount"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-0 max-w-xs">
                <div className="bg-card rounded-lg shadow-md p-4">
                  <div className="flex flex-col items-center mb-3">
                    <TrendingUp className="h-7 w-7 text-primary mb-2" />
                    <h4 className="font-bold text-foreground">{t('simulator.margin')}</h4>
                  </div>
                  <div className="text-sm text-foreground space-y-2">
                    <p>{t('simulator.marginHelp').split('\n\n')[0]}</p>
                    <p>{t('simulator.marginHelp').split('\n\n')[1]}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            {simulation && (
              <p className="text-xs text-muted-foreground">
                Default margin is set to 2x the hedge cost ({(simulation.costDetails.hedgeCost * 2).toFixed(2)} {baseCurrency}). 
                This amount will be added to the fees ({simulation.costDetails.hedgeCost.toFixed(2)} {baseCurrency}) for a total 
                payment of {(simulation.costDetails.hedgeCost + (margin !== null ? margin : simulation.costDetails.hedgeCost * 2)).toFixed(2)} {baseCurrency}.
              </p>
            )}

            {simulation && (
              <div className="space-y-4 pt-4">
                {showGraph && (
                  <CurrencyChart data={{
                    historicalRates: simulation.historicalRates,
                    currentRate: simulation.rate,
                    tradeDirection: tradeDirection,
                    breakEvenRate: simulation.breakEvenRate
                  }} />
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('simulator.currentRate')}</p>
                    <p className="text-2xl font-bold">
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
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Stop Loss Rate</p>
                    <p className="text-2xl font-bold">
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

                {/* Update margin based on simulation results only if no user input */}
                {simulation && (() => {
                  // Only set default margin if user hasn't entered a custom value
                  if (margin === null && marginInput === '') {
                    setMargin(simulation.costDetails.hedgeCost * 2);
                  }
                  return null;
                })()}

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

      {/* Payment Modal - Using StandaloneWindowPayment for complete isolation from React refresh cycles */}
      {isPaymentModalOpen && pendingHedgeData && (
        <Dialog open={isPaymentModalOpen} onOpenChange={(open: boolean) => !open && setIsPaymentModalOpen(false)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {t('Complete o pagamento para realizar o hedge', 'Complete Payment to Place Hedge')}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {t('Uma nova janela será aberta para o processamento do pagamento. Mantenha-a aberta até concluir o pagamento.', 
                   'A new window will open for payment processing. Keep it open until you complete the payment.')}
              </p>
            </DialogHeader>

            {/* Always use StandaloneWindowPayment for consistency */}
            <StandaloneWindowPayment
              hedgeData={pendingHedgeData}
              onSuccess={handlePaymentSuccess}
              onClose={() => setIsPaymentModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}