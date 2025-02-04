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
  // XTB expects currency pairs in a specific format
  return `${base}${target}`;
}

async function ensureXTBConnection() {
  try {
    console.log('[Currency API] Checking XTB connection...');
    // Try to connect if not already connected
    if (!xtbService.isConnected) {
      console.log('[Currency API] Connecting to XTB...');
      await xtbService.connect({
        userId: import.meta.env.VITE_XTB_USER_ID || '17474971',
        password: import.meta.env.VITE_XTB_PASSWORD || 'xoh74681',
      });
      console.log('[Currency API] Successfully connected to XTB');
    } else {
      console.log('[Currency API] Already connected to XTB');
    }
  } catch (error) {
    console.error('[Currency API] Failed to connect to XTB:', error);
    throw new Error('Failed to connect to trading platform. Please try again.');
  }
}

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  await ensureXTBConnection();
  const symbol = getXTBSymbol(base, target);

  console.log(`[Currency API] Fetching current rate for ${symbol}...`);
  const streamStatus = await xtbService.checkStreamConnection();
  console.log('[Currency API] Stream connection status:', streamStatus);

  try {
    const response = await xtbService.getSymbolData(symbol);
    console.log(`[Currency API] Symbol response for ${symbol}:`, response);

    if (!response.status || !response.returnData) {
      console.error(`[Currency API] Failed to get data for ${symbol}:`, response);
      throw new Error(`Failed to fetch rate for ${symbol}`);
    }

    console.log(`[Currency API] Successfully fetched rate for ${symbol}:`, response.returnData.ask);
    return response.returnData.ask;
  } catch (error) {
    console.error('[Currency API] Error fetching exchange rate:', error);
    throw new Error(`Failed to fetch current exchange rate for ${base}/${target}`);
  }
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  await ensureXTBConnection();
  const symbol = getXTBSymbol(base, target);

  try {
    console.log(`[Currency API] Fetching ${days} days of historical data for ${symbol}...`);
    const historicalData = await xtbService.getHistoricalData(symbol, days);
    console.log(`[Currency API] Raw historical data for ${symbol}:`, historicalData);

    if (!historicalData || historicalData.length === 0) {
      console.error(`[Currency API] No historical data available for ${symbol}`);
      throw new Error('No historical data available');
    }

    const processedData = historicalData.map(point => ({
      date: point.date,
      rate: point.rate
    }));

    console.log(`[Currency API] Processed historical data for ${symbol}:`, processedData);
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
}