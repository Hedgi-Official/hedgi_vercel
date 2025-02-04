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

function getYahooSymbol(base: SupportedCurrency, target: SupportedCurrency): string {
  return `${base}${target}=X`;
}

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  try {
    console.log(`[Currency API] Fetching current rate for ${base}/${target}...`);
    const symbol = getYahooSymbol(base, target);
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const price = data.chart.result[0].meta.regularMarketPrice;

    if (!price) {
      throw new Error(`No rate available for ${base}/${target}`);
    }

    console.log(`[Currency API] Rate for ${base}/${target}:`, price);
    return price;
  } catch (error) {
    console.error('[Currency API] Error fetching exchange rate:', error);
    throw new Error(`Failed to fetch current exchange rate for ${base}/${target}`);
  }
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  try {
    console.log(`[Currency API] Fetching ${days} days historical data for ${base}/${target}...`);
    const symbol = getYahooSymbol(base, target);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${days}d`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const timestamps = data.chart.result[0].timestamp;
    const closePrices = data.chart.result[0].indicators.quote[0].close;

    if (!timestamps || !closePrices || timestamps.length === 0) {
      throw new Error('No historical data available');
    }

    const processedData = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString(),
      rate: closePrices[index]
    })).filter((point: { rate: number }) => point.rate !== null);

    console.log(`[Currency API] Processed ${processedData.length} historical records`);
    return processedData;
  } catch (error) {
    console.error('[Currency API] Error fetching historical rates:', error);
    throw new Error(`Failed to fetch historical exchange rates for ${base}/${target}`);
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
  } catch (error) {
    console.error('[Currency API] Error in hedge simulation:', error);
    throw error;
  }
}