/**
 * Shared 4-decimal FX-rate formatter. Kept as a small standalone helper
 * so the Businesses PreviewCard and the What is Hedging hero render
 * the same underlying `useHeroRate()` value with identical precision
 * and locale handling. PT locale swaps the decimal separator to
 * comma to match the rest of the site's number formatting.
 */
export function formatRate(n: number, isPt: boolean): string {
  const fixed = n.toFixed(4);
  return isPt ? fixed.replace(".", ",") : fixed;
}
