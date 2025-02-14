/**
 * Calculate total hedging cost based on XTB parameters
 */
export interface HedgeCostParams {
  durationDays: number;
  value: number;
  rateNative: number;
  rateHedge: number;
  leverage: number;
  spread: number;
  overnight: number;
}

export function calculateHedgingCost({
  durationDays,
  value,
  rateNative,
  rateHedge,
  leverage,
  spread,
  overnight
}: HedgeCostParams): number {
  // 1. Calculate overnight fees
  const overnightCost = durationDays * overnight;

  // 2. Calculate spread cost
  const spreadCost = spread * value;

  // 3. Calculate base cost and additional fee
  const baseCost = overnightCost + spreadCost;
  const additionalFee = Math.min(0.01 * baseCost, 10);

  // 4. Apply markup factor (5% extra)
  const totalCost = (baseCost + additionalFee) * 1.05;

  return totalCost;
}
