export const LOT_SIZE = 100000;

export interface PnLInput {
  direction: string;
  entryPrice: number;
  currentBid?: number;
  currentAsk?: number;
  volume: number;
  symbol: string;
}

export interface PnLResult {
  pnl: number;
  pnlUsd: number;
  currentPrice: number;
  entryValue: number;
  currentValue: number;
  quoteCurrency: string;
}

const QUOTE_CURRENCIES: Record<string, string> = {
  USDBRL: "BRL",
  EURUSD: "USD",
  USDMXN: "MXN",
  GBPUSD: "USD",
  USDJPY: "JPY",
  AUDUSD: "USD",
  USDCAD: "CAD",
  USDCHF: "CHF",
};

const BASE_CURRENCIES: Record<string, string> = {
  USDBRL: "USD",
  EURUSD: "EUR",
  USDMXN: "USD",
  GBPUSD: "GBP",
  USDJPY: "USD",
  AUDUSD: "AUD",
  USDCAD: "USD",
  USDCHF: "USD",
};

export function calculatePnL(input: PnLInput, usdConversionRate?: number): PnLResult | null {
  const { direction, entryPrice, currentBid, currentAsk, volume, symbol } = input;
  
  const normalizedDirection = direction.toUpperCase();
  const quoteCurrency = QUOTE_CURRENCIES[symbol] || "USD";
  const baseCurrency = BASE_CURRENCIES[symbol] || symbol.slice(0, 3);
  
  let currentPrice: number;
  if (normalizedDirection === "BUY") {
    if (currentBid === undefined || currentBid === null) return null;
    currentPrice = currentBid;
  } else {
    if (currentAsk === undefined || currentAsk === null) return null;
    currentPrice = currentAsk;
  }
  
  const notionalVolume = volume * LOT_SIZE;
  
  const entryValue = entryPrice * notionalVolume;
  const currentValue = currentPrice * notionalVolume;
  
  let pnl: number;
  if (normalizedDirection === "BUY") {
    pnl = (currentPrice - entryPrice) * notionalVolume;
  } else {
    pnl = (entryPrice - currentPrice) * notionalVolume;
  }
  
  let pnlUsd = pnl;
  
  if (quoteCurrency !== "USD") {
    if (usdConversionRate && usdConversionRate > 0) {
      if (baseCurrency === "USD") {
        pnlUsd = pnl / usdConversionRate;
      } else {
        pnlUsd = pnl / usdConversionRate;
      }
    } else {
      pnlUsd = pnl;
    }
  }
  
  return {
    pnl,
    pnlUsd,
    currentPrice,
    entryValue,
    currentValue,
    quoteCurrency,
  };
}

export function formatPnL(pnl: number, currency = "USD"): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${pnl.toFixed(2)} ${currency}`;
}

export function formatPrice(price: number, decimals = 5): string {
  return price.toFixed(decimals);
}
