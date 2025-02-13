import { differenceInBusinessDays, isWeekend } from 'date-fns';

export type Market = 'BR' | 'US' | 'MX';

interface MarketHoliday {
  date: string;
  name: string;
  market: Market;
}

// Cache market holidays to avoid repeated API calls
const holidayCache = new Map<Market, MarketHoliday[]>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
let lastCacheUpdate: number | null = null;

async function fetchMarketHolidays(market: Market, year: number): Promise<MarketHoliday[]> {
  try {
    // Using FBS API to fetch market holidays
    const response = await fetch(`/api/fbs-rate/holidays?market=${market}&year=${year}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch market holidays: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching market holidays:', error);
    return [];
  }
}

async function getMarketHolidays(market: Market, startDate: Date, endDate: Date): Promise<MarketHoliday[]> {
  const now = Date.now();
  
  // Check if cache needs refresh
  if (!lastCacheUpdate || (now - lastCacheUpdate > CACHE_DURATION)) {
    const years = new Set([
      startDate.getFullYear(),
      endDate.getFullYear()
    ]);
    
    const holidays: MarketHoliday[] = [];
    for (const year of years) {
      const yearHolidays = await fetchMarketHolidays(market, year);
      holidays.push(...yearHolidays);
    }
    
    holidayCache.set(market, holidays);
    lastCacheUpdate = now;
  }
  
  return holidayCache.get(market) || [];
}

export async function countMarketClosures(
  endDate: Date,
  startDate: Date = new Date(),
  market: Market = 'BR'
): Promise<number> {
  try {
    // Ensure dates are proper Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get basic business days count (excluding weekends)
    const businessDays = differenceInBusinessDays(end, start);
    
    // Get market holidays
    const holidays = await getMarketHolidays(market, start, end);
    
    // Count holidays that fall on business days within our date range
    const holidayCount = holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return (
        holidayDate >= start &&
        holidayDate < end &&
        !isWeekend(holidayDate)
      );
    }).length;
    
    // Business days minus holidays
    const tradingDays = businessDays - holidayCount;
    
    console.log(`Market closures calculation:`, {
      startDate: start,
      endDate: end,
      market,
      businessDays,
      holidayCount,
      tradingDays
    });
    
    return tradingDays;
  } catch (error) {
    console.error('Error calculating market closures:', error);
    throw error;
  }
}
