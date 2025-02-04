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
  if (!response.ok) {
    throw new Error('Failed to fetch current exchange rate');
  }
  const data = await response.json();
  return data.rates[target];
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  const rates: Array<{ date: string; rate: number }> = [];
  const today = new Date();

  // Since we can't fetch future dates, limit to current date
  const currentDate = new Date();
  const startDate = new Date();
  startDate.setDate(currentDate.getDate() - days);

  // Fetch historical data for each day
  for (let date = new Date(startDate); date <= currentDate; date.setDate(date.getDate() + 1)) {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${base}`
      );

      if (!response.ok) {
        console.error(`Failed to fetch rates for ${formattedDate}:`, await response.text());
        continue;
      }

      const data = await response.json();
      rates.push({
        date: date.toISOString(),
        rate: data.rates[target]
      });
    } catch (error) {
      console.error(`Error fetching rates for ${date}:`, error);
      // Continue with other dates if one fails
      continue;
    }
  }

  // If we couldn't get any rates, throw an error
  if (rates.length === 0) {
    throw new Error('Failed to fetch historical exchange rates');
  }

  return rates;
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

  // Calculate costs in most valuable currency
  const baseCost = 5; // Base cost in most valuable currency
  const dailyCost = 10 * duration; // Daily cost in most valuable currency
  const totalCostInMVC = baseCost + dailyCost;

  // Convert total cost to target currency
  const mvcToTargetRate = target === mostValuableCurrency ? 1 : await fetchExchangeRate(mostValuableCurrency, target);
  const totalCostInTarget = totalCostInMVC * mvcToTargetRate;

  // Calculate percentage cost relative to hedged amount in target currency
  const hedgedAmountInTarget = amount;
  const costPercentage = (totalCostInTarget / hedgedAmountInTarget) * 100;

  // Calculate break-even rate based on trade direction
  const breakEvenRate = tradeDirection === 'sell'
    ? rate * (1 + costPercentage / 100) // When selling target currency, break-even is higher (get more base currency)
    : rate * (1 - costPercentage / 100); // When buying target currency, break-even is lower (pay less base currency)

  // Get historical rates for the chart
  const historicalRates = await fetchHistoricalRates(base, target, duration);

  return {
    rate,
    hedgedAmount: hedgedAmountInTarget,
    totalCost: totalCostInTarget,
    breakEvenRate,
    costDetails: {
      costPercentage
    },
    historicalRates
  };
}