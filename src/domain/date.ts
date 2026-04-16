import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format as fnsFormat,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';

/** Default timezone — could be moved to user settings. */
export const DEFAULT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Parse YYYY-MM-DD (local wall time) or a full ISO string. */
export function parseDate(input: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // Treat as local midnight, not UTC — avoids off-by-one.
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return parseISO(input);
}

export function toISODate(d: Date): string {
  return fnsFormat(d, 'yyyy-MM-dd');
}

export function toISO(d: Date): string {
  return d.toISOString();
}

export function formatDate(d: Date, pattern = 'dd/MM/yyyy'): string {
  return fnsFormat(d, pattern);
}

export function isValidDateString(s: string): boolean {
  if (typeof s !== 'string') return false;
  const d = parseDate(s);
  return !Number.isNaN(d.getTime());
}

export function isInRange(d: Date, start: Date | null, end: Date | null): boolean {
  if (start && isBefore(d, startOfDay(start))) return false;
  if (end && isAfter(d, endOfDay(end))) return false;
  return true;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function nextOccurrence(from: Date, frequency: Frequency, step = 1): Date {
  switch (frequency) {
    case 'daily':
      return addDays(from, step);
    case 'weekly':
      return addWeeks(from, step);
    case 'monthly':
      return addMonths(from, step);
    case 'yearly':
      return addYears(from, step);
  }
}

export { addDays, addMonths, startOfMonth, endOfMonth, differenceInCalendarDays, isEqual };
