import { z } from "zod";

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Exchange rates relative to USD for determining the most valuable currency
const CURRENCY_VALUES = {
  USD: 1,
  EUR: 1.08,
  BRL: 0.20,
  MXN: 0.058
};

// Simple in-memory cache for rates
const rateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute in milliseconds

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      console.error(`[Currency API] Attempt ${i + 1} failed with status ${response.status}`);
    } catch (error) {
      console.error(`[Currency API] Attempt ${i + 1} failed with error:`, error);
      if (i === retries - 1) throw error;
    }
    // Wait before retrying (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
  }
  throw new Error(`Failed after ${retries} attempts`);
}

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  const cacheKey = `${base}${target}`;
  const cached = rateCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[Currency API] Using cached rate for ${base}/${target}:`, cached.rate);
    return cached.rate;
  }

  try {
    console.log(`[Currency API] Fetching current rate for ${base}/${target}...`);
    const response = await fetchWithRetry(
      `https://api.exchangerate.host/convert?from=${base}&to=${target}&amount=1`
    );

    const data = await response.json();

    if (!data.success || !data.result) {
      throw new Error(`Invalid response for ${base}/${target}`);
    }

    const rate = data.result[target];
    console.log(`[Currency API] Rate for ${base}/${target}:`, rate);

    // Cache the result
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });

    return rate;
  } catch (error) {
    console.error('[Currency API] Error fetching exchange rate:', error);
    throw new Error(`Failed to fetch current exchange rate for ${base}/${target}`);
  }
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  try {
    console.log(`[Currency API] Fetching ${days} days historical data for ${base}/${target}...`);

    // Calculate date range
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const response = await fetchWithRetry(
      `https://api.exchangerate.host/timeseries?start_date=${startStr}&end_date=${endStr}&base=${base}&symbols=${target}`
    );

    const data = await response.json();

    if (!data.success || !data.rates) {
      throw new Error('Invalid historical data response');
    }

    const processedData = Object.entries(data.rates).map(([date, rates]: [string, any]) => ({
      date: new Date(date).toISOString(),
      rate: rates[target]
    })).filter(point => point.rate !== null);

    if (processedData.length === 0) {
      throw new Error('No historical data available');
    }

    console.log(`[Currency API] Processed ${processedData.length} historical records`);
    return processedData;
  } catch (error) {
    console.error('[Currency API] Error fetching historical rates:', error);
    throw new Error(`Failed to fetch historical exchange rates for ${base}/${target}`);
  }
}

export async function simulateHedge(
  base: SupportedCurrency,
  target: SupportedCurrency,
  amount: number,
  duration: number,
  tradeDirection: 'buy' | 'sell' = 'buy'
) {
  try {
    // Get current rate
    const rate = await fetchExchangeRate(base, target);
    console.log(`[Currency API] Current rate for ${base}/${target}:`, rate);

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
      ? rate * (1 + costPercentage / 100) // When selling target currency, break-even is higher
      : rate * (1 - costPercentage / 100); // When buying target currency, break-even is lower

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
  } catch (error) {
    console.error('[Currency API] Error in hedge simulation:', error);
    throw error;
  }
}

function getMostValuableCurrency(currency1: SupportedCurrency, currency2: SupportedCurrency): SupportedCurrency {
  return CURRENCY_VALUES[currency1] > CURRENCY_VALUES[currency2] ? currency1 : currency2;
}