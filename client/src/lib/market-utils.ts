import { differenceInBusinessDays } from 'date-fns';

export type Market = 'BR' | 'US' | 'MX';

export function countMarketClosures(
  endDate: Date,
  startDate: Date = new Date(),
): number {
  try {
    // Ensure dates are proper Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get business days count (excluding weekends)
    const businessDays = differenceInBusinessDays(end, start);

    console.log(`Market closures calculation:`, {
      startDate: start,
      endDate: end,
      businessDays,
    });

    return businessDays;
  } catch (error) {
    console.error('Error calculating market closures:', error);
    throw error;
  }
}