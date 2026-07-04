// Pakistani work schedule utilities
// Work days: Saturday through Thursday (6 days)
// Off day: Friday
// Work hours: 8 hours per day

/**
 * Check if a date is a working day (Saturday-Thursday)
 * Friday (day 5) is off in Pakistan
 */
export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 5; // 5 = Friday
}

/**
 * Get the next working day from a given date
 */
export function getNextWorkingDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (!isWorkingDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Add working days to a date (skipping Fridays)
 */
export function addWorkingDays(startDate: Date, workingDays: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result)) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Calculate working days between two dates
 */
export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    current.setDate(current.getDate() + 1);
    if (isWorkingDay(current)) {
      count++;
    }
  }
  
  return count;
}

/**
 * Convert duration in days to working hours (8 hours per day)
 */
export function daysToHours(days: number): number {
  return days * 8;
}

/**
 * Calculate planned end date from start date and duration in working days
 */
export function calculateEndDate(startDate: string, durationDays: number): string {
  const start = new Date(startDate);
  const end = addWorkingDays(start, durationDays);
  return end.toISOString().split('T')[0];
}

/**
 * Calculate stage dates sequentially
 */
export interface StageDate {
  stageId: string;
  stageName: string;
  durationDays: number;
  plannedStartDate: string;
  plannedEndDate: string;
  skip: boolean;
}

export function calculateSequentialStageDates(
  stages: Array<{ id: string; stage_name: string; default_duration_days?: number }>,
  startDate: string
): StageDate[] {
  let currentDate = new Date(startDate);
  
  return stages.map((stage) => {
    const duration = (stage as any).default_duration_days || 1;
    
    // Set start time to 9:00 AM
    const startDateTime = new Date(currentDate);
    startDateTime.setHours(9, 0, 0, 0);
    const plannedStartDate = startDateTime.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
    
    // Calculate end date and set end time to 5:00 PM
    const endDate = addWorkingDays(currentDate, duration);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(17, 0, 0, 0);
    const plannedEndDate = endDateTime.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
    
    // Move to next day after this stage ends
    currentDate = getNextWorkingDay(endDate);
    
    return {
      stageId: stage.id,
      stageName: stage.stage_name,
      durationDays: duration,
      plannedStartDate,
      plannedEndDate,
      skip: false,
    };
  });
}
