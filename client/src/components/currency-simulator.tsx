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
import type { Hedge } from '@db/schema';

interface Props {
  showGraph?: boolean;
  onPlaceHedge?: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt"> & { tradeDirection: 'buy' | 'sell' }) => void;
}

export function CurrencySimulator({ showGraph = true, onPlaceHedge }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('BRL');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const { toast } = useToast();
  
  const handleSimulate = async () => {
    const currencyPair = `${targetCurrency}${baseCurrency}`;

    let currentRate;
    let swapValues;
    try {
      // Use server API to get the latest rates
      console.log('[CurrencySimulator] Fetching rates from server for', currencyPair);
      
      // Get rates from the server-side API
      const response = await fetch('/api/xtb/rates');
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Server error: ${response.status}`;
        console.error('[CurrencySimulator] API error:', errorMessage);
        
        toast({
          variant: "destructive",
          title: "Error fetching rates",
          description: errorMessage,
        });
        
        throw new Error(errorMessage);
      }
      
      const rates = await response.json();
      console.log('[CurrencySimulator] Server rates:', rates);
      
      // Find the matching currency pair
      const rateData = rates.find((rate: any) => 
        rate.symbol === currencyPair || 
        // Handle reverse currency pairs if needed
        rate.symbol === `${baseCurrency}${targetCurrency}`
      );
      
      if (rateData) {
        currentRate = {
          bid: rateData.bid,
          ask: rateData.ask
        };
        swapValues = {
          swapLong: rateData.swapLong,
          swapShort: rateData.swapShort
        };
        console.log('[CurrencySimulator] Using server rates:', currentRate);
        console.log('[CurrencySimulator] Using swap values:', swapValues);
      } else {
        console.warn(`[CurrencySimulator] No data found for ${currencyPair}`);
        toast({
          variant: "destructive",
          title: "Currency Pair Not Available",
          description: `No data available for ${currencyPair}. Using estimated rates.`,
        });
      }
    } catch (error) {
      console.error('[CurrencySimulator] Error fetching rates:', error);
      toast({
        variant: "destructive",
        title: "Rate Fetch Error",
        description: "Unable to get current market rates. Using estimated rates.",
      });
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

    const breakEvenRate = tradeDirection === 'buy' ?
      currentRate ? currentRate.ask * (1 + costPercentage / 100) :
      result.rate * (1 + costPercentage / 100) :
      currentRate ? currentRate.bid * (1 - costPercentage / 100) :
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
    if (onPlaceHedge && simulation) {
      // Prepare the hedge data
      const hedgeData = {
        baseCurrency,
        targetCurrency,
        amount: amount.toString(),
        rate: simulation.rate.toString(),
        duration,
        tradeDirection,
        tradeOrderNumber: null,
        tradeStatus: null
      };
      
      try {
        // Use our server-side API endpoint
        console.log('[CurrencySimulator] Placing hedge through server API', hedgeData);
        
        const response = await fetch('/api/xtb/hedge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hedgeData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `Failed to place hedge (${response.status})`;
          console.error('[CurrencySimulator] Hedge placement error:', errorMessage);
          
          toast({
            variant: "destructive",
            title: "Trade Failed",
            description: errorMessage,
          });
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('[CurrencySimulator] Hedge result:', result);
        
        toast({
          title: "Hedge Placed",
          description: "Your currency hedge has been placed successfully.",
        });
        
        // Call the original onPlaceHedge handler
        onPlaceHedge(hedgeData);
      } catch (error: any) {
        console.error('[CurrencySimulator] Error placing hedge:', error);
        
        toast({
          variant: "destructive",
          title: "Trade Failed",
          description: error.message || "Failed to place hedge. Please try again.",
        });
      }
    }
  };
  const getTradeDirectionHelp = () => {
    if (tradeDirection === 'buy') {
      return `I will make a payment in ${targetCurrency} in the future`;
    }
    return `I will receive ${targetCurrency} and convert to ${baseCurrency} in the future`;
  };

  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl mx-auto bg-background shadow-lg relative z-10">
        <CardHeader>
          <CardTitle>{t('simulator.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('simulator.targetCurrency')}</label>
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
              <TooltipContent>
                <p>{t('simulator.buyHelp')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('simulator.baseCurrency')}</label>
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
              <TooltipContent>
                <p>{t('simulator.sellHelp')}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('simulator.tradeDirection')}</label>
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
            <TooltipContent>
              <p>{tradeDirection === 'buy' ?
                `${t('simulator.buyHelp')} ${targetCurrency}` :
                `${t('simulator.sellHelp')} ${baseCurrency}`} {t('simulator.inFuture')}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('simulator.amount')} {targetCurrency}</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={1000}
                  max={1000000}
                  placeholder={t('simulator.amountField')}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('simulator.amountHelp')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2">
                <label className="text-sm font-medium">
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
            <TooltipContent>
              <p>{t('simulator.durationHelp')}</p>
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
                      const currentRate = tradeDirection === 'buy' ? simulation.rate : simulation.rate;
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

              {showGraph && (
                <div className="pt-4">
                  <CurrencyChart
                    data={{
                      historicalRates: simulation.historicalRates,
                      breakEvenRate: simulation.breakEvenRate,
                      currentRate: simulation.rate,
                      tradeDirection: tradeDirection
                    }}
                  />
                </div>
              )}

              {onPlaceHedge && (
                <Button
                  onClick={handlePlaceHedge}
                  className="w-full"
                  variant="outline"
                >
                  {t('simulator.placeHedge')}
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