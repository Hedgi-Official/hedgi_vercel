import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CurrencySelect } from "./currency-select";
import { useCurrencyRates } from "@/hooks/use-currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InsertHedge } from "@db/schema";

// Helper function to calculate business days between dates
function getBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

// Calculate hedge costs
function calculateHedgeCost(amount: number, businessDays: number): number {
  const baseAmount = 10000; // Reference amount for base cost
  const dailyRate = 10; // Cost per business day
  const flatFee = 5; // Opening/closing fee

  const scaling = amount / baseAmount;
  return (dailyRate * businessDays + flatFee) * scaling;
}

export function HedgeSimulator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [baseCurrency] = useState("USD");
  const [targetCurrency] = useState("BRL");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("7");

  const { data: rates } = useCurrencyRates(baseCurrency);

  const createHedgeMutation = useMutation({
    mutationFn: async (hedge: Omit<InsertHedge, "userId" | "id">) => {
      const res = await fetch("/api/hedges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hedge),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hedges"] });
      toast({
        title: "Success",
        description: "Hedge created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter an amount between 0 and 10,000",
      });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(duration));

    createHedgeMutation.mutate({
      baseCurrency,
      targetCurrency,
      amount: numAmount.toString(), // Convert to string for decimal type
      startDate,
      endDate,
      status: "active",
    });
  };

  // Calculate simulation results
  const simulationResults = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return null;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(duration));

    const businessDays = getBusinessDays(startDate, endDate);
    const hedgeCost = calculateHedgeCost(numAmount, businessDays);
    const currentRate = rates?.rates?.[targetCurrency] || 0;

    // Calculate break-even rate
    const totalCostBRL = hedgeCost * currentRate;
    const breakEvenRateIncrease = (totalCostBRL / numAmount);
    const breakEvenRate = currentRate + breakEvenRateIncrease;

    return {
      cost: hedgeCost,
      currentRate,
      breakEvenRate,
      businessDays,
    };
  }, [amount, duration, rates, targetCurrency]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Amount (USD)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={10000}
            step="0.01"
            required
          />
          <p className="text-sm text-muted-foreground">Maximum: $10,000 USD</p>
        </div>

        <div className="space-y-2">
          <Label>Duration (days)</Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            max="30"
            min="1"
            required
          />
          <p className="text-sm text-muted-foreground">Maximum: 30 days</p>
        </div>
      </div>

      {simulationResults && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              Based on current exchange rates and hedge costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Exchange Rate:</p>
              <p className="text-2xl font-bold">
                1 USD = {simulationResults.currentRate.toFixed(4)} BRL
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Hedge Cost:</p>
              <p className="text-2xl font-bold">
                ${simulationResults.cost.toFixed(2)} USD
              </p>
              <p className="text-sm text-muted-foreground">
                For {simulationResults.businessDays} business days
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Break-even Exchange Rate:</p>
              <p className="text-2xl font-bold">
                1 USD = {simulationResults.breakEvenRate.toFixed(4)} BRL
              </p>
              <p className="text-sm text-muted-foreground">
                The exchange rate needed for the hedge to become profitable
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full">
        Create Hedge
      </Button>
    </form>
  );
}