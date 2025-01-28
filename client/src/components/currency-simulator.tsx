import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { simulateHedge } from '@/lib/currency-api';
import { CurrencyChart } from './currency-chart';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD'];

export function CurrencySimulator() {
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [amount, setAmount] = useState(1000);
  const [duration, setDuration] = useState(7);
  const [simulation, setSimulation] = useState(null);

  const handleSimulate = async () => {
    const result = await simulateHedge(
      baseCurrency,
      targetCurrency,
      amount,
      duration
    );
    setSimulation(result);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Currency Hedge Simulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select value={baseCurrency} onValueChange={setBaseCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Base Currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(currency => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={targetCurrency} onValueChange={setTargetCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Target Currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(currency => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          max={10000}
          placeholder="Amount to hedge"
        />

        <div className="space-y-2">
          <label className="text-sm">Duration: {duration} days</label>
          <Slider
            value={[duration]}
            onValueChange={([value]) => setDuration(value)}
            max={30}
            step={1}
          />
        </div>

        <Button onClick={handleSimulate} className="w-full">
          Simulate Hedge
        </Button>

        {simulation && (
          <div className="mt-4">
            <CurrencyChart
              data={{
                rate: simulation.rate,
                worstCase: simulation.worstCase,
                bestCase: simulation.bestCase,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
