import { z } from "zod";

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Sample rates based on current XTB market data
const SAMPLE_RATES = {
  'USDBRL': {
    bid: 5.8322,
    ask: 5.8332,
  },
  'EURUSD': {
    bid: 1.03229,
    ask: 1.03231,
  },
  'USDMXN': {
    bid: 20.3975,
    ask: 20.4000,
  }
};

function generateHistoricalRates(currentRate: number, days: number) {
  const volatility = 0.01; // 1% daily volatility
  const data = [];
  const now = new Date();

  // Start with current rate and work backwards
  let prevRate = currentRate;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    if (i === 0) {
      // Use exact current rate for today
      data.push({
        date: date.toISOString(),
        rate: currentRate
      });
    } else {
      // Generate historical rates with realistic movements
      const maxChange = prevRate * volatility;
      const randomChange = (Math.random() - 0.5) * maxChange;
      prevRate = prevRate + randomChange;

      data.push({
        date: date.toISOString(),
        rate: Number(prevRate.toFixed(4))
      });
    }
  }

  return data;
}

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  try {
    console.log(`[Currency API] Fetching rate for ${base}/${target}`);

    // Direct rate lookup
    const key = `${base}${target}`;
    if (SAMPLE_RATES[key]) {
      return {
        bid: SAMPLE_RATES[key].bid,
        ask: SAMPLE_RATES[key].ask
      };
    }

    // Inverse rate lookup
    const inverseKey = `${target}${base}`;
    if (SAMPLE_RATES[inverseKey]) {
      return {
        bid: Number((1 / SAMPLE_RATES[inverseKey].ask).toFixed(4)),
        ask: Number((1 / SAMPLE_RATES[inverseKey].bid).toFixed(4))
      };
    }

    throw new Error(`Rate not available for ${base}/${target}`);
  } catch (error) {
    console.error('[Currency API] Error:', error);
    throw new Error(`Failed to fetch rate for ${base}/${target}`);
  }
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  try {
    const currentRates = await fetchExchangeRate(base, target);
    // Use mid-rate for historical data
    const midRate = (currentRates.bid + currentRates.ask) / 2;
    return generateHistoricalRates(midRate, days);
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

    // Get current rates
    const rates = await fetchExchangeRate(base, target);
    const rate = tradeDirection === 'buy' ? rates.ask : rates.bid; // Buy at ask, sell at bid
    console.log(`[Currency API] Current rate: ${rate}`);

    // Calculate hedge costs using realistic market conditions
    // Base spread cost (difference between buy and sell rates)
    const spreadCost = ((rates.ask - rates.bid) / rates.bid) * 100;

    // Forward points cost (increases with duration)
    const forwardPointsCost = 0.02 * (duration / 30); // 0.02% per month equivalent

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