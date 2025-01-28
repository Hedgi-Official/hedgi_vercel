import { z } from "zod";

const API_KEY = "YOUR_API_KEY"; // Would use env var in production

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Exchange rates relative to USD for determining the most valuable currency
const CURRENCY_VALUES = {
  USD: 1,
  EUR: 1.08,
  BRL: 0.20,
  MXN: 0.058
};

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${base}`
  );
  const data = await response.json();
  return data.rates[target];
}

function getMostValuableCurrency(currency1: SupportedCurrency, currency2: SupportedCurrency): SupportedCurrency {
  return CURRENCY_VALUES[currency1] > CURRENCY_VALUES[currency2] ? currency1 : currency2;
}

export async function simulateHedge(
  base: SupportedCurrency,
  target: SupportedCurrency,
  amount: number,
  duration: number,
  tradeDirection: 'buy' | 'sell' = 'buy'
) {
  const rate = await fetchExchangeRate(base, target);
  const mostValuableCurrency = getMostValuableCurrency(base, target);

  // Calculate costs in most valuable currency (USD)
  const baseCost = 5; // Base cost in USD
  const dailyCost = 10 * duration; // Daily cost in USD
  const totalCostInMVC = baseCost + dailyCost;

  // Convert total cost to base currency (e.g., BRL)
  // If base is most valuable, no conversion needed
  // Otherwise, convert from MVC (USD) to base currency
  const mvcToBaseRate = base === mostValuableCurrency ? 1 : await fetchExchangeRate(mostValuableCurrency, base);
  const totalCostInBase = totalCostInMVC * mvcToBaseRate;

  // Calculate percentage cost relative to hedged amount
  const hedgedAmountInTarget = amount;
  const costPercentage = (totalCostInBase / (hedgedAmountInTarget * rate)) * 100;

  // Calculate break-even rate based on trade direction
  const breakEvenRate = tradeDirection === 'sell'
    ? rate * (1 + costPercentage / 100) // When selling target currency, break-even is higher (get more base currency)
    : rate * (1 - costPercentage / 100); // When buying target currency, break-even is lower (pay less base currency)

  return {
    rate,
    hedgedAmount: hedgedAmountInTarget,
    totalCost: totalCostInBase, // Cost already in base currency
    breakEvenRate,
    costDetails: {
      costPercentage
    }
  };
}