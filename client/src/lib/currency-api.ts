import { z } from "zod";

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
export type CurrencyPair = `${SupportedCurrency}${SupportedCurrency}`;

// Sample rates for development/testing
const SAMPLE_RATES: Record<CurrencyPair, number> = {
  'USDUSD': 1.00,
  'USDBRL': 4.95,
  'USDEUR': 0.93,
  'USDMXN': 17.05,
  'EURUSD': 1.08,
  'EUREUR': 1.00,
  'EURBRL': 5.35,
  'EURMXN': 18.45,
  'BRLUSD': 0.20,
  'BRLEUR': 0.19,
  'BRLBRL': 1.00,
  'BRLMXN': 3.45,
  'MXNUSD': 0.059,
  'MXNEUR': 0.054,
  'MXNBRL': 0.29,
  'MXNMXN': 1.00,
} as const;

function generateHistoricalRates(baseRate: number, days: number) {
  const volatility = 0.02; // 2% daily volatility
  const data = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate a random walk with mean reversion
    const randomChange = (Math.random() - 0.5) * volatility;
    const rate = baseRate * (1 + randomChange);

    data.push({
      date: date.toISOString(),
      rate: Number(rate.toFixed(4))
    });
  }

  return data;
}

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  try {
    console.log(`[Currency API] Fetching rate for ${base}/${target}`);
    const key = `${base}${target}` as CurrencyPair;

    // If direct rate exists
    if (key in SAMPLE_RATES) {
      return SAMPLE_RATES[key];
    }

    // If inverse rate exists
    const inverseKey = `${target}${base}` as CurrencyPair;
    if (inverseKey in SAMPLE_RATES) {
      return 1 / SAMPLE_RATES[inverseKey];
    }

    // Calculate cross rate via USD
    if (base !== 'USD' && target !== 'USD') {
      const baseUSD = `${base}USD` in SAMPLE_RATES ? 
        SAMPLE_RATES[`${base}USD` as CurrencyPair] : 
        1 / SAMPLE_RATES[`USD${base}` as CurrencyPair];
      const targetUSD = `${target}USD` in SAMPLE_RATES ? 
        SAMPLE_RATES[`${target}USD` as CurrencyPair] : 
        1 / SAMPLE_RATES[`USD${target}` as CurrencyPair];
      return baseUSD / targetUSD;
    }

    throw new Error(`Rate not available for ${base}/${target}`);
  } catch (error) {
    console.error('[Currency API] Error:', error);
    throw new Error(`Failed to fetch rate for ${base}/${target}`);
  }
}

export async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  try {
    const currentRate = await fetchExchangeRate(base, target);
    return generateHistoricalRates(currentRate, days);
  } catch (error) {
    console.error('[Currency API] Error fetching historical rates:', error);
    throw error;
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
    console.log(`[Currency API] Simulating hedge for ${amount} ${target}`);

    // Get current rate
    const rate = await fetchExchangeRate(base, target);
    console.log(`[Currency API] Current rate: ${rate}`);

    // Calculate hedge costs using more realistic market conditions
    // Base spread cost (difference between buy and sell rates)
    const spreadCost = 0.15; // 0.15% typical FX spread

    // Forward points cost (increases with duration)
    const forwardPointsCost = 0.02 * (duration / 30); // 0.02% per month equivalent

    // Transaction fee
    const transactionFee = 0.1; // 0.1% fixed transaction fee

    // Total cost percentage
    const costPercentage = spreadCost + forwardPointsCost + transactionFee;

    // Calculate total cost in target currency
    const totalCost = (amount * costPercentage) / 100;

    // Calculate break-even rate
    const breakEvenRate = tradeDirection === 'sell' ?
      rate * (1 + costPercentage / 100) :
      rate * (1 - costPercentage / 100);

    // Get historical rates
    const historicalRates = await fetchHistoricalRates(base, target, duration);

    const result = {
      rate,
      hedgedAmount: amount,
      totalCost,
      breakEvenRate,
      costDetails: {
        costPercentage,
        spreadCost,
        forwardPointsCost,
        transactionFee
      },
      historicalRates
    };

    console.log('[Currency API] Simulation result:', result);
    return result;
  } catch (error) {
    console.error('[Currency API] Simulation error:', error);
    throw error;
  }
}

function getMostValuableCurrency(currency1: SupportedCurrency, currency2: SupportedCurrency): SupportedCurrency {
  const CURRENCY_VALUES = {
    USD: 1,
    EUR: 1.08,
    BRL: 0.20,
    MXN: 0.058
  };
  return CURRENCY_VALUES[currency1] > CURRENCY_VALUES[currency2] ? currency1 : currency2;
}