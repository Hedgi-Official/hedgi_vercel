import { useState, useEffect } from 'react';
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
import { xtbService } from '@/lib/xtb-service';
import { useToast } from '@/hooks/use-toast';
import type { Hedge } from '@db/schema';

interface Props {
  showGraph?: boolean;
  onPlaceHedge?: (hedgeData: Omit<Hedge, "id" | "userId" | "status" | "createdAt" | "completedAt">) => void;
  onOrdersUpdated?: () => void; // Added callback for refreshing orders list
}

export function CurrencySimulator({ showGraph = true, onPlaceHedge, onOrdersUpdated }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('BRL');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isPlacingHedge, setIsPlacingHedge] = useState(false);
  const [hedgeError, setHedgeError] = useState<string | null>(null);

  // Connection status state to prevent infinite loop
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  
  // Add effect for successful XTB connection notification
  useEffect(() => {
    // Only attempt to connect once 
    if (connectionAttempted) return;
    
    const connectToXTB = async () => {
      try {
        setConnectionAttempted(true);
        
        if (!xtbService.isConnected) {
          console.log("[CurrencySimulator] Connecting to trading service...");
          
          try {
            // Connect returns void but updates isConnected internally
            await xtbService.connect({
              userId: import.meta.env.VITE_XTB_USER_ID || '17474971',
              password: import.meta.env.VITE_XTB_PASSWORD || 'xoh74681',
            });
            
            // Small delay to allow connection status to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check the connection status after the operation
            if (xtbService.isConnected) {
              console.log("[CurrencySimulator] Successfully connected to trading service");
              toast({
                title: "Connection Successful",
                description: "Successfully connected to trading service",
                variant: "default"
              });
            }
          } catch (connectError) {
            console.error('[CurrencySimulator] Connection error:', connectError);
            // Don't show toast here to avoid double notifications
          }
        }
      } catch (error) {
        console.error('[CurrencySimulator] Error in connection process:', error);
        toast({
          title: "Connection Failed",
          description: "Failed to connect to trading service. Try again later.",
          variant: "destructive"
        });
      }
    };
    
    connectToXTB();
  }, [toast, connectionAttempted]);

  const handleSimulate = async () => {
    const currencyPair = `${targetCurrency}${baseCurrency}`;

    let currentRate;
    let swapValues;
    try {
      // Only attempt API call if we've already tried to connect
      if (connectionAttempted && !xtbService.isConnected) {
        console.log('[CurrencySimulator] Using fallback rates due to connection issue');
        // Skip XTB connection attempts if already failed
      } else if (!xtbService.isConnected) {
        try {
          // Single connection attempt with timeout
          console.log('[CurrencySimulator] Attempting to connect for simulation');
          await Promise.race([
            xtbService.connect({
              userId: import.meta.env.VITE_XTB_USER_ID || '17474971',
              password: import.meta.env.VITE_XTB_PASSWORD || 'xoh74681',
            }),
            // 5 second timeout to prevent hanging on connection
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
          ]);
        } catch (connErr) {
          console.warn('[CurrencySimulator] Connection attempt failed, using fallback rates:', connErr);
        }
      }

      // Only attempt to get symbol data if connected
      if (xtbService.isConnected) {
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
          console.log('[CurrencySimulator] Using XTB rates:', currentRate);
          console.log('[CurrencySimulator] Using XTB swap values:', swapValues);
        }
      }
    } catch (error) {
      console.error('[CurrencySimulator] Error fetching XTB rate:', error);
      toast({
        title: "Rate Fetch Warning",
        description: "Could not get live rates. Using estimated rates instead.",
        variant: "destructive"
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
    
    // Show success toast for simulation completion
    toast({
      title: "Simulation Complete",
      description: `Successfully calculated hedge costs for ${amount} ${targetCurrency}`,
      variant: "default"
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
      // Check connection to trading service before placement
      if (!connectionAttempted) {
        // Show warning that API connection hasn't been established
        toast({
          title: "Connection Status Unknown",
          description: "Trading service connection not verified",
          variant: "destructive"
        });
      } else if (connectionAttempted && !xtbService.isConnected) {
        // Show warning but continue with hedge placement
        toast({
          title: "Trading Service Warning",
          description: "Connected to fallback service. Order will be processed.", 
          variant: "destructive"
        });
      }
      
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
      
      // Show success toast for hedge placement
      toast({
        title: "Hedge Placed Successfully",
        description: `Successfully placed ${tradeDirection} hedge for ${amount} ${targetCurrency}`,
        variant: "default"
      });
    } catch (error) {
      console.error('[CurrencySimulator] Error placing hedge:', error);
      setHedgeError(error instanceof Error ? error.message : 'Failed to place hedge');
      
      // Show error toast
      toast({
        title: "Hedge Placement Failed",
        description: error instanceof Error ? error.message : 'Failed to place hedge',
        variant: "destructive"
      });
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