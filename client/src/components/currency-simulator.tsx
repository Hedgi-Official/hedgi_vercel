import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { simulateHedge } from '@/lib/currency-api';
import { CurrencyChart } from './currency-chart';

export function CurrencySimulator() {
  const [amount, setAmount] = useState(10000);
  const [duration, setDuration] = useState(7);
  const [simulation, setSimulation] = useState(null);

  const handleSimulate = async () => {
    const result = await simulateHedge(
      'USD',
      'BRL',
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
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount in USD</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={1000}
            max={1000000}
            placeholder="Amount to hedge"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Duration: {duration} days</label>
          <Slider
            value={[duration]}
            onValueChange={([value]) => setDuration(value)}
            max={30}
            step={1}
          />
        </div>

        <Button onClick={handleSimulate} className="w-full">
          Calculate Hedge Cost
        </Button>

        {simulation && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Rate</p>
                <p className="text-2xl font-bold">
                  {simulation.rate.toFixed(4)} BRL/USD
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Break-even Rate</p>
                <p className="text-2xl font-bold">
                  {simulation.breakEvenRate.toFixed(4)} BRL/USD
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Cost Breakdown</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Base Cost</span>
                  <span>${simulation.costDetails.baseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Costs</span>
                  <span>${simulation.costDetails.dailyCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Cost</span>
                  <span>${simulation.totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <CurrencyChart data={simulation} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}