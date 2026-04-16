import { describe, it, expect } from 'vitest';
import {
  amountSchema,
  transactionSchema,
  accountSchema,
  isoDateSchema,
  budgetSchema,
} from '@domain/validation.ts';

describe('validation schemas', () => {
  describe('amount', () => {
    it('accepts valid positive amounts', () => {
      expect(amountSchema.safeParse('100').success).toBe(true);
      expect(amountSchema.safeParse('1.234,56').success).toBe(true);
      expect(amountSchema.safeParse('0.01').success).toBe(true);
    });

    it('rejects zero', () => {
      expect(amountSchema.safeParse('0').success).toBe(false);
    });

    it('rejects empty', () => {
      expect(amountSchema.safeParse('').success).toBe(false);
    });

    it('rejects absurdly large numbers', () => {
      expect(amountSchema.safeParse('1e20').success).toBe(false);
    });

    it('rejects non-numeric strings', () => {
      expect(amountSchema.safeParse('abc').success).toBe(false);
    });
  });

  describe('isoDate', () => {
    it('accepts today and near dates', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(isoDateSchema.safeParse(today).success).toBe(true);
      expect(isoDateSchema.safeParse('2024-01-01').success).toBe(true);
    });

    it('rejects malformed dates', () => {
      expect(isoDateSchema.safeParse('not-a-date').success).toBe(false);
      expect(isoDateSchema.safeParse('13/13/2024').success).toBe(false);
    });

    it('rejects dates far in the future', () => {
      expect(isoDateSchema.safeParse('3030-01-01').success).toBe(false);
    });
  });

  describe('transactionSchema', () => {
    it('parses a valid transaction', () => {
      const result = transactionSchema.safeParse({
        accountId: 'acc_1',
        description: 'Sueldo',
        amount: '100000',
        type: 'income',
        date: '2025-01-15',
        tags: [],
      });
      expect(result.success).toBe(true);
    });

    it('fails without required fields', () => {
      const result = transactionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('accountSchema', () => {
    it('parses a valid account', () => {
      expect(
        accountSchema.safeParse({
          name: 'Galicia ARS',
          type: 'bank',
          currency: 'ARS',
          initialBalance: '0',
        }).success,
      ).toBe(true);
    });

    it('rejects invalid currency', () => {
      expect(
        accountSchema.safeParse({
          name: 'x',
          type: 'bank',
          currency: 'ZZZ',
        }).success,
      ).toBe(false);
    });
  });

  describe('budgetSchema', () => {
    it('parses a valid budget', () => {
      expect(
        budgetSchema.safeParse({
          categoryId: 'cat_1',
          amount: '50000',
          currency: 'ARS',
          startDate: '2025-01-01',
        }).success,
      ).toBe(true);
    });
  });
});
