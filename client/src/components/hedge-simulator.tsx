import { useState } from "react";
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

export function HedgeSimulator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [targetCurrency, setTargetCurrency] = useState("EUR");
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
      amount: numAmount,
      startDate,
      endDate,
      status: "active",
    });
  };

  const exchangeRate = rates?.rates?.[targetCurrency] || 0;
  const estimatedValue = parseFloat(amount) * exchangeRate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Base Currency</Label>
          <CurrencySelect
            value={baseCurrency}
            onChange={setBaseCurrency}
            excludeValue={targetCurrency}
          />
        </div>

        <div className="space-y-2">
          <Label>Target Currency</Label>
          <CurrencySelect
            value={targetCurrency}
            onChange={setTargetCurrency}
            excludeValue={baseCurrency}
          />
        </div>

        <div className="space-y-2">
          <Label>Amount (max $10,000)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={10000}
            step="0.01"
            required
          />
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulation Results</CardTitle>
          <CardDescription>
            Based on current exchange rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {amount ? (
              <>
                {parseFloat(amount).toFixed(2)} {baseCurrency} ={" "}
                {estimatedValue.toFixed(2)} {targetCurrency}
              </>
            ) : (
              "Enter an amount to see simulation"
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full">
        Create Hedge
      </Button>
    </form>
  );
}
