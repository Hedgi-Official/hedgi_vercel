export interface SyntheticPairConfig {
  legs: [string, string];
  bridgeCurrency: string;
  leg1Direction: 'buy' | 'sell'; // Direction for leg 1
  leg2Direction: 'buy' | 'sell'; // Direction for leg 2
}

export const SYNTHETIC_PAIRS: Record<string, SyntheticPairConfig> = {
  // BRL/CNY: Sell USDBRL (buy USD with BRL) + Buy USDCNY (buy CNY with USD) = Net long CNY vs BRL
  "BRL/CNY": { 
    legs: ["USDBRL", "USDCNY"], 
    bridgeCurrency: "USD",
    leg1Direction: 'sell', // Sell USDBRL to get USD
    leg2Direction: 'buy'   // Buy USDCNY to get CNY
  },
};

export interface SyntheticTradeLeg {
  pair: string;
  tradeId: number;
  direction: "buy" | "sell";
  volume: number;
  symbol: string;
}

export interface SyntheticTrade {
  syntheticPair: string;
  syntheticTradeId: string;
  legs: SyntheticTradeLeg[];
  direction: "buy" | "sell";
  volume: number;
  createdAt: Date;
  status: "open" | "closed" | "partial";
}

export function isSyntheticPair(pair: string): boolean {
  const normalizedPair = pair.replace(/[\/\-_]/g, "/");
  return normalizedPair in SYNTHETIC_PAIRS;
}

export function getSyntheticConfig(pair: string): SyntheticPairConfig | null {
  const normalizedPair = pair.replace(/[\/\-_]/g, "/");
  return SYNTHETIC_PAIRS[normalizedPair] || null;
}

export function formatPairForBackend(pair: string): string {
  return pair.replace(/[\/\-_]/g, "");
}

export function computeSyntheticPrice(leg1Price: number, leg2Price: number): number {
  // For BRL/CNY: USDBRL / USDCNY gives BRL per CNY
  // Example: 5.34 / 7.26 = 0.736 BRL per CNY
  return leg1Price / leg2Price;
}

export function computeSyntheticPnL(leg1PnL: number, leg2PnL: number): number {
  return leg1PnL + leg2PnL;
}

export function calculateLegVolumes(
  syntheticPair: string,
  totalVolume: number,
  direction: "buy" | "sell"
): { leg1Volume: number; leg2Volume: number; leg1Direction: "buy" | "sell"; leg2Direction: "buy" | "sell" } {
  const config = getSyntheticConfig(syntheticPair);
  if (!config) {
    throw new Error(`Unknown synthetic pair: ${syntheticPair}`);
  }

  // Use the predefined directions from config for synthetic pairs
  // The 'direction' parameter is ignored for synthetic pairs as each leg has its own direction
  return {
    leg1Volume: totalVolume,
    leg2Volume: totalVolume,
    leg1Direction: config.leg1Direction,
    leg2Direction: config.leg2Direction,
  };
}

export function generateSyntheticTradeId(): string {
  return `SYN${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

export function parseCurrencyPair(symbol: string): { base: string; quote: string } | null {
  if (symbol.length === 6) {
    return {
      base: symbol.substring(0, 3),
      quote: symbol.substring(3, 6),
    };
  }
  
  const withSlash = symbol.match(/^([A-Z]{3})[\/\-_]([A-Z]{3})$/);
  if (withSlash) {
    return {
      base: withSlash[1],
      quote: withSlash[2],
    };
  }
  
  return null;
}

export function formatPairDisplay(base: string, quote: string): string {
  return `${base}/${quote}`;
}
