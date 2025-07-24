
import { z } from "zod";

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
export type CurrencyPair = `${SupportedCurrency}${SupportedCurrency}`;

// Sample rates for development/testing - these should only be used as absolute fallback
const SAMPLE_RATES: Record<CurrencyPair, number> = {
  'USDBRL': 4.95,
  'USDEUR': 0.93,
  'USDMXN': 17.05,
  'EURUSD': 1.08,
  'EURBRL': 5.35,
  'EURMXN': 18.45,
  'BRLUSD': 0.20,
  'BRLEUR': 0.19,
  'BRLMXN': 3.45,
  'MXNUSD': 0.059,
  'MXNEUR': 0.054,
  'MXNBRL': 0.29,
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
        1 / SAMPLE_RATES[`USD${base}` as CurrKeyPair];
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
    console.log(`[Currency API] Simulating hedge for ${amount} ${target} - NOTE: This should use Flask server rates`);

    // WARNING: This function should not be used in production
    // All pricing should come from Flask servers via ActivTrades/FBS/Tickmill APIs
    console.warn('[Currency API] simulateHedge is deprecated - use broker APIs directly');

    // Get fallback rate only for historical data generation
    const rate = await fetchExchangeRate(base, target);
    console.log(`[Currency API] Fallback rate: ${rate}`);

    // Get historical rates for chart display
    const historicalRates = await fetchHistoricalRates(base, target, duration);

    // Return minimal data - real hedge calculations should be done in components
    // using actual broker rates from Flask servers
    const result = {
      rate,
      hedgedAmount: amount,
      totalCost: 0, // Should be calculated using real broker rates
      breakEvenRate: rate, // Should be calculated using real broker rates
      costDetails: {
        costPercentage: 0,
        spreadCost: 0,
        forwardPointsCost: 0,
        transactionFee: 0
      },
      historicalRates
    };

    console.log('[Currency API] Simulation result (DEPRECATED):', result);
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
