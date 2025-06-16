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