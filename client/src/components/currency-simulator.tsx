import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { simulateHedge, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency-api';
import { CurrencyChart } from './currency-chart';
import { calculateBusinessDays } from '@/lib/utils';
import { xtbService } from '@/lib/xtb-service';
import type { Hedge } from '@db/schema';

interface Props {
  showGraph?: boolean;
  onPlaceHedge?: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  title?: string;
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

export function CurrencySimulator({ showGraph = true, onPlaceHedge, title }: Props) {
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('BRL');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; rate: number }> | null>(null);

  const handleSimulate = async () => {
    setIsLoadingHistorical(true);
    const currencyPair = `${targetCurrency}${baseCurrency}`;

    // Only fetch XTB rate when simulation is requested
    let currentRate;
    let swapValues;
    try {
      // Connect to XTB if not already connected
      if (!xtbService.isConnected) {
        await xtbService.connect({
          userId: import.meta.env.VITE_XTB_USER_ID || '17474971',
          password: import.meta.env.VITE_XTB_PASSWORD || 'xoh74681',
        });
      }

      const symbolData = await xtbService.getSymbolData(currencyPair);
      console.log('[CurrencySimulator] XTB symbol data:', symbolData);

      if (symbolData.status && symbolData.returnData) {
        currentRate = {
          bid: symbolData.returnData.bid,
          ask: symbolData.returnData.ask
        };
        swapValues = {
          swapLong: symbolData.returnData.swapLong,
          swapShort: symbolData.returnData.swapShort
        };
      }
    } catch (error) {
      console.error('[CurrencySimulator] Error fetching XTB rate:', error);
    }

    // Fetch historical data from XTB
    try {
      const data = await xtbService.getHistoricalData(currencyPair, duration);
      setHistoricalData(data);
    } catch (error) {
      console.error('[CurrencySimulator] Error fetching historical data:', error);
      setHistoricalData(null);
    }
    setIsLoadingHistorical(false);

    const result = await simulateHedge(
      baseCurrency,
      targetCurrency,
      amount,
      duration,
      tradeDirection
    );

    // Calculate business days
    const businessDays = calculateBusinessDays(new Date(), duration);

    // Calculate hedge cost based on the provided formulas
    let hedgeCost = 0;
    if (currentRate && swapValues) {
      const { bid, ask } = currentRate;
      const { swapLong, swapShort } = swapValues;
      const spreadCost = (ask - bid) * amount;

      if (tradeDirection === 'buy') {
        // Buy formula: ((businessDays * swapLong/bid) * (hedgeSize/10) + (ask-bid) * hedgeSize) * ask
        hedgeCost = (businessDays * (swapLong / bid) * (amount / 10)) * ask + spreadCost;
      } else {
        // Sell formula: ((businessDays * swapShort/bid) * (hedgeSize/10) + (ask-bid) * hedgeSize) * ask
        hedgeCost = (businessDays * (swapShort / bid) * (amount / 10)) * ask + spreadCost;
      }
    }

    // Calculate cost percentage based on actual hedge cost
    const costPercentage = currentRate ? (hedgeCost / amount / currentRate.bid) * 100 : 0;

    // Calculate break-even rate using actual hedge costs
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

  const handlePlaceHedge = () => {
    if (onPlaceHedge && simulation) {
      onPlaceHedge({
        baseCurrency,
        targetCurrency,
        amount,
        rate: simulation.rate,
        duration
      });
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
          <CardTitle> {title || "Hedging Simulator"} </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Currency</label>
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
                <p>The currency of the payment you will make or receive in the future, that you are protecting against varying</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Base Currency</label>
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
                <p>The currency whose fluctuations you are protecting against</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trade Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={tradeDirection === 'buy' ? 'default' : 'outline'}
                        onClick={() => setTradeDirection('buy')}
                      >
                        Buy {targetCurrency}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>I will make a payment in {targetCurrency} in the future</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={tradeDirection === 'sell' ? 'default' : 'outline'}
                        onClick={() => setTradeDirection('sell')}
                      >
                        Sell {targetCurrency}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>I will receive {targetCurrency} and convert to {baseCurrency} in the future</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getTradeDirectionHelp()}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount in {targetCurrency}</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={1000}
                  max={1000000}
                  placeholder="Amount to hedge"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enter the total amount of {targetCurrency} involved in the future transaction</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration: {duration} days</label>
                <Slider
                  value={[duration]}
                  onValueChange={([value]) => setDuration(value)}
                  max={30}
                  step={1}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select how many days until your {targetCurrency} transaction is due</p>
            </TooltipContent>
          </Tooltip>

          <Button onClick={handleSimulate} className="w-full">
            Calculate Hedge Cost
          </Button>

          {simulation && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Rate</p>
                  <p className="text-2xl font-bold">
                    {simulation.rate.toFixed(4)} {baseCurrency}/{targetCurrency}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Break-even Rate</p>
                  <p className="text-2xl font-bold">
                    {simulation.breakEvenRate.toFixed(4)} {baseCurrency}/{targetCurrency}
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
                <h3 className="font-medium">Hedge Details</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>Total Cost</span>
                    <span>
                      {simulation.costDetails.hedgeCost.toFixed(2)} {baseCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Business Days</span>
                    <span>{simulation.businessDays} days</span>
                  </div>
                </div>
              </div>

              {showGraph && (
                <div className="pt-4">
                  {isLoadingHistorical ? (
                    <div className="text-center py-4">Loading historical data...</div>
                  ) : (
                    <CurrencyChart
                      data={{
                        historicalRates: historicalData || [],
                        breakEvenRate: simulation.breakEvenRate,
                        currentRate: simulation.rate,
                        tradeDirection: tradeDirection
                      }}
                    />
                  )}
                </div>
              )}

              {onPlaceHedge && (
                <Button
                  onClick={handlePlaceHedge}
                  className="w-full"
                  variant="outline"
                >
                  Place Hedge
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}