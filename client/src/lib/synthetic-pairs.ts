export interface SyntheticPairConfig {
  legs: [string, string];
  bridgeCurrency: string;
}

export const SYNTHETIC_PAIRS: Record<string, SyntheticPairConfig> = {
  "BRL/CNY": { legs: ["BRL/USD", "USD/CNY"], bridgeCurrency: "USD" },
  "BRL/CHF": { legs: ["BRL/USD", "USD/CHF"], bridgeCurrency: "USD" },
  "MXN/CNY": { legs: ["MXN/USD", "USD/CNY"], bridgeCurrency: "USD" },
  "MXN/CHF": { legs: ["MXN/USD", "USD/CHF"], bridgeCurrency: "USD" },
  "INR/CHF": { legs: ["INR/USD", "USD/CHF"], bridgeCurrency: "USD" },
  "INR/CNY": { legs: ["INR/USD", "USD/CNY"], bridgeCurrency: "USD" },
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
  return leg1Price * leg2Price;
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

  return {
    leg1Volume: totalVolume,
    leg2Volume: totalVolume,
    leg1Direction: direction,
    leg2Direction: direction,
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
