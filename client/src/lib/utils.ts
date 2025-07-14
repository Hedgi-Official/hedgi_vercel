import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateBusinessDays(startDate: Date, durationInDays: number): number {
  let businessDays = 0;
  const currentDate = new Date(startDate);

  // Include current day if it's a business day
  if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
    businessDays++;
  }

  // Count business days for the remaining duration
  for (let i = 1; i < durationInDays; i++) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 is Sunday, 6 is Saturday
      businessDays++;
    }
  }

  return businessDays;
}

export function calculateBusinessDaysBetweenDates(startDate: Date, endDate: Date): number {
  let businessDays = 0;
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  // Set times to start of day to avoid time zone issues
  currentDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 is Sunday, 6 is Saturday
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return businessDays;
}

export function countWednesdaysInNextDays(days: number): number {
  let wednesdayCount = 0;
  const today = new Date();
  
  // Check each day from today up to the specified number of days
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    
    // Wednesday is day 3 (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, etc.)
    if (currentDate.getDay() === 3) {
      wednesdayCount++;
    }
  }
  
  return wednesdayCount;
}

export function countWednesdaysBetweenDates(startDate: Date, endDate: Date): number {
  let wednesdayCount = 0;
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  // Set times to start of day to avoid time zone issues
  currentDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (currentDate <= end) {
    // Wednesday is day 3 (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, etc.)
    if (currentDate.getDay() === 3) {
      wednesdayCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return wednesdayCount;
}

export function getDaysBetweenDates(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set times to start of day to avoid time zone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date);
}

export function getNextBusinessDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (isWeekend(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

export function getMinimumHedgeDate(): Date {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // If tomorrow is a weekend, find the next business day
  if (isWeekend(tomorrow)) {
    return getNextBusinessDay(tomorrow);
  }
  
  return tomorrow;
}