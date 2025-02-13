import { z } from "zod";
import { countMarketClosures } from './market-utils';
import { xtbService } from './xtb-service';

export const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'MXN'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export async function fetchExchangeRate(base: SupportedCurrency, target: SupportedCurrency) {
  try {
    console.log(`[Currency API] Fetching rate for ${base}/${target}`);
    const symbol = `${target}${base}`;

    // Get the rate from XTB service
    const symbolData = await xtbService.getSymbolData(symbol);
    if (!symbolData.status || !symbolData.returnData) {
      throw new Error(`Failed to get rate for ${symbol}`);
    }

    // Return bid rate as it represents the current market rate
    return symbolData.returnData.bid;
  } catch (error) {
    console.error('[Currency API] Error:', error);
    throw new Error(`Failed to fetch rate for ${base}/${target}`);
  }
}

async function fetchBidAskRates(base: SupportedCurrency, target: SupportedCurrency) {
  try {
    const symbol = `${target}${base}`;
    const symbolData = await xtbService.getSymbolData(symbol);

    if (!symbolData.status || !symbolData.returnData) {
      throw new Error(`Failed to get rates for ${symbol}`);
    }

    return {
      bid: symbolData.returnData.bid,
      ask: symbolData.returnData.ask
    };
  } catch (error) {
    console.error('[Currency API] Error fetching bid/ask rates:', error);
    throw error;
  }
}

async function fetchHistoricalRates(base: SupportedCurrency, target: SupportedCurrency, days: number) {
  try {
    const symbol = `${target}${base}`;
    return await xtbService.getHistoricalData(symbol, days);
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

    // Get current bid/ask rates
    const { bid, ask } = await fetchBidAskRates(base, target);
    console.log(`[Currency API] Bid: ${bid}, Ask: ${ask}`);

    // Use appropriate rate based on trade direction
    const rate = tradeDirection === 'buy' ? ask : bid;
    console.log(`[Currency API] Using ${tradeDirection} rate: ${rate}`);

    // Calculate end date based on duration
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // Get number of business days (excluding weekends)
    const businessDays = await countMarketClosures(endDate, startDate);
    console.log(`[Currency API] Business days: ${businessDays}`);

    // Calculate hedge costs based on business days
    // Base spread cost (difference between buy and sell rates)
    const spreadCost = ((ask - bid) / bid) * 100; // Actual spread cost from market

    // Forward points cost (increases with business days)
    const forwardPointsCost = 0.02 * (businessDays / 20); // 0.02% per 20 business days

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
        businessDays
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