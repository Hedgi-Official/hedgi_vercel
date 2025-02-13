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
import { useXTB } from "@/hooks/use-xtb";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
    businessDays: number;
    spreadCost: number;
    forwardPointsCost: number;
    transactionFee: number;
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
  const [isSimulating, setIsSimulating] = useState(false);

  // Get real-time rates from XTB
  const { exchangeRates, isConnected, isLoading: isLoadingRates, error: xtbError } = useXTB();
  const { toast } = useToast();

  const handleSimulate = async () => {
    if (!isConnected || isLoadingRates) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Please wait for the connection to the trading platform to be established."
      });
      return;
    }

    setIsSimulating(true);

    try {
      // Find the current rates for the selected currency pair
      const currentRates = exchangeRates?.find(rate => rate.symbol === `${targetCurrency}${baseCurrency}`);

      if (!currentRates) {
        throw new Error(`No exchange rates available for ${targetCurrency}/${baseCurrency}`);
      }

      const result = await simulateHedge(
        baseCurrency,
        targetCurrency,
        amount,
        duration,
        tradeDirection,
        { bid: currentRates.bid, ask: currentRates.ask }
      );
      setSimulation(result);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Simulation Error",
        description: error.message || "Failed to simulate hedge"
      });
    } finally {
      setIsSimulating(false);
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
      <Card className="w-full max-w-2xl mx-auto bg-background shadow-lg relative z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Currency Hedge Simulator
            {(isLoadingRates || !isConnected) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {xtbError && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
              {xtbError}
            </div>
          )}

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

          <Button 
            onClick={handleSimulate} 
            className="w-full"
            disabled={isSimulating || isLoadingRates || !isConnected}
          >
            {isSimulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              'Calculate Hedge Cost'
            )}
          </Button>

          {simulation && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Rate</p>
                  <p className="text-2xl font-bold">
                    {(1 / simulation.rate).toFixed(4)} {baseCurrency}/{targetCurrency}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Break-even Rate</p>
                  <p className="text-2xl font-bold">
                    {(1 / simulation.breakEvenRate).toFixed(4)} {baseCurrency}/{targetCurrency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({tradeDirection === 'buy' ? '+' : '-'}{simulation.costDetails.costPercentage.toFixed(2)}%)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Hedge Details</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>Total Cost</span>
                    <span>
                      {(simulation.totalCost / simulation.rate).toFixed(2)} {baseCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Business Days</span>
                    <span>{simulation.costDetails.businessDays} days</span>
                  </div>
                </div>
              </div>

              {showGraph && (
                <div className="pt-4">
                  <CurrencyChart
                    data={{
                      historicalRates: simulation.historicalRates,
                      currentRate: simulation.rate,
                      tradeDirection
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