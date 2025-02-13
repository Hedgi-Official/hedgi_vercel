import { z } from "zod";
import { countMarketClosures, type Market } from './market-utils';

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Sample rates for development/testing
const SAMPLE_RATES = {
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
};

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
    const key = `${base}${target}`;

    // If direct rate exists
    if (SAMPLE_RATES[key]) {
      return SAMPLE_RATES[key];
    }

    // If inverse rate exists
    const inverseKey = `${target}${base}`;
    if (SAMPLE_RATES[inverseKey]) {
      return 1 / SAMPLE_RATES[inverseKey];
    }

    // Calculate cross rate via USD
    if (base !== 'USD' && target !== 'USD') {
      const baseUSD = SAMPLE_RATES[`${base}USD`] || 1 / SAMPLE_RATES[`USD${base}`];
      const targetUSD = SAMPLE_RATES[`${target}USD`] || 1 / SAMPLE_RATES[`USD${target}`];
      return baseUSD / targetUSD;
    }

    throw new Error(`Rate not available for ${base}/${target}`);
  } catch (error) {
    console.error('[Currency API] Error:', error);
    throw new Error(`Failed to fetch rate for ${base}/${target}`);
  }
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
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

    // Determine market based on currency pair
    let market: Market = 'BR';
    if (base === 'USD' || target === 'USD') {
      market = 'US';
    } else if (base === 'MXN' || target === 'MXN') {
      market = 'MX';
    }

    // Calculate end date based on duration
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // Get number of market closures
    const marketClosures = await countMarketClosures(endDate, startDate, market);
    console.log(`[Currency API] Market closures: ${marketClosures}`);

    // Calculate hedge costs using market closures
    // Base spread cost (difference between buy and sell rates)
    const spreadCost = 0.15; // 0.15% typical FX spread

    // Forward points cost (increases with actual trading days)
    const forwardPointsCost = 0.02 * (marketClosures / 20); // 0.02% per 20 trading days

    // Transaction fee
    const transactionFee = 0.1; // 0.1% fixed transaction fee

    // Total cost percentage
    const costPercentage = spreadCost + forwardPointsCost + transactionFee;

    // Calculate total cost in target currency
    const totalCost = (amount * costPercentage) / 100;

    // Calculate break-even rate
    const breakEvenRate = tradeDirection === 'sell'
      ? rate * (1 + costPercentage / 100)
      : rate * (1 - costPercentage / 100);

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
        transactionFee,
        marketClosures
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