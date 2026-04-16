import { describe, it, expect } from 'vitest';
import { parseDate, toISODate, isInRange, nextOccurrence, isValidDateString } from '@domain/date.ts';

describe('date helpers', () => {
  it('parses YYYY-MM-DD as local midnight (no UTC shift)', () => {
    const d = parseDate('2025-01-15');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('round-trips through toISODate', () => {
    expect(toISODate(parseDate('2025-06-30'))).toBe('2025-06-30');
  });

  it('isValidDateString works for common cases', () => {
    expect(isValidDateString('2025-01-01')).toBe(true);
    expect(isValidDateString('totally-not')).toBe(false);
  });

  it('isInRange handles nulls as no bound', () => {
    const d = parseDate('2025-01-15');
    expect(isInRange(d, null, null)).toBe(true);
    expect(isInRange(d, parseDate('2025-01-01'), parseDate('2025-01-31'))).toBe(true);
    expect(isInRange(d, parseDate('2025-02-01'), null)).toBe(false);
    expect(isInRange(d, null, parseDate('2024-12-31'))).toBe(false);
  });

  it('nextOccurrence advances by frequency', () => {
    const start = parseDate('2025-01-15');
    expect(toISODate(nextOccurrence(start, 'daily'))).toBe('2025-01-16');
    expect(toISODate(nextOccurrence(start, 'weekly'))).toBe('2025-01-22');
    expect(toISODate(nextOccurrence(start, 'monthly'))).toBe('2025-02-15');
    expect(toISODate(nextOccurrence(start, 'yearly'))).toBe('2026-01-15');
  });
});
