import { z } from "zod";
import { xtbService } from './xtb-service';

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Exchange rates relative to USD for determining the most valuable currency
const CURRENCY_VALUES = {
  USD: 1,
  EUR: 1.08,
  BRL: 0.20,
  MXN: 0.058
};

function getXTBSymbol(base: SupportedCurrency, target: SupportedCurrency): string {
  return `${base}${target}`;
}

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  const symbol = getXTBSymbol(base, target);
  try {
    const response = await xtbService.getSymbolData(symbol);
    if (!response.status || !response.returnData) {
      throw new Error('Failed to fetch current exchange rate');
    }
    return response.returnData.ask;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw new Error('Failed to fetch current exchange rate');
  }
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  const symbol = getXTBSymbol(base, target);
  try {
    return await xtbService.getHistoricalData(symbol, days);
  } catch (error) {
    console.error('Error fetching historical rates:', error);
    throw new Error('Failed to fetch historical exchange rates');
  }
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