import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { simulateHedge, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency-api';
import { CurrencyChart } from './currency-chart';
import type { Hedge } from '@db/schema';
import { ExchangeRatesWidget } from './exchange-rates-widget';

interface Props {
  showGraph?: boolean;
  onPlaceHedge?: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
}

interface SimulationResult {
  rate: number;
  breakEvenRate: number;
  totalCost: number;
  hedgedAmount: number;
  costDetails: {
    costPercentage: number;
  };
  historicalRates: Array<{
    date: string;
    rate: number;
  }>;
}

export function CurrencySimulator({ showGraph = true, onPlaceHedge }: Props) {
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('BRL');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [showingRates, setShowingRates] = useState(false);

  const handleSimulate = async () => {
    try {
      setShowingRates(true);
      const result = await simulateHedge(
        baseCurrency,
        targetCurrency,
        amount,
        duration,
        tradeDirection
      );
      setSimulation(result);
    } catch (error) {
      console.error('Simulation error:', error);
    }
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
      <div className="space-y-6">
        <Card className="w-full max-w-2xl mx-auto bg-background shadow-lg relative z-10">
          <CardHeader>
            <CardTitle>Currency Hedge Simulator</CardTitle>
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
                  <p>The currency of the payment you will make or receive in the future</p>
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
          </CardContent>
        </Card>

        {/* Exchange Rates Widget appears first after simulation */}
        {showingRates && (
          <div className="transition-all duration-300 ease-in-out">
            <ExchangeRatesWidget />
          </div>
        )}

        {/* Simulation results and graph appear after */}
        {simulation && (
          <Card className="w-full max-w-2xl mx-auto bg-background shadow-lg">
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Rate</p>
                  <p className="text-2xl font-bold">
                    {simulation.rate.toFixed(4)} {baseCurrency}/{targetCurrency}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold">
                    {(simulation.totalCost / simulation.rate).toFixed(2)} {baseCurrency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({simulation.costDetails.costPercentage.toFixed(2)}%)
                  </p>
                </div>
              </div>

              {showGraph && (
                <div className="pt-4">
                  <CurrencyChart
                    data={{
                      historicalRates: simulation.historicalRates,
                      currentRate: simulation.rate,
                      tradeDirection: tradeDirection
                    }}
                  />
                </div>
              )}

              {onPlaceHedge && (
                <Button
                  onClick={handlePlaceHedge}
                  className="w-full mt-4"
                  variant="outline"
                >
                  Place Hedge
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}