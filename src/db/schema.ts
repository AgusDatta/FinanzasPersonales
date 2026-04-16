import Dexie, { type Table } from 'dexie';
import type { CurrencyCode } from '@domain/money.ts';
import type { Frequency } from '@domain/date.ts';

export interface AccountRow {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'card' | 'savings';
  currency: CurrencyCode;
  initialBalance: string;
  icon: string;
  archived: boolean;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionRow {
  id: string;
  accountId: string;
  description: string;
  /** Decimal string. Positive for income, positive for expense (sign inferred from `type`). */
  amount: string;
  currency: CurrencyCode;
  type: TransactionType;
  categoryId?: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  tags: string[];
  /** Paired transaction id, for transfers */
  pairId?: string;
  /** Hash used for deduplication on import (date + amount + description) */
  dedupHash?: string;
  fxSnapshot?: {
    rate: string;
    displayCurrency: CurrencyCode;
    source: string;
  };
  recurringId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  parentId?: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  keywords?: string[];
  createdAt: string;
}

export interface BudgetRow {
  id: string;
  categoryId: string;
  amount: string;
  currency: CurrencyCode;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  rollover: boolean;
  createdAt: string;
}

export interface SavingsGoalRow {
  id: string;
  name: string;
  target: string;
  currency: CurrencyCode;
  current: string;
  deadline?: string;
  accountId?: string;
  createdAt: string;
}

export interface RecurringRuleRow {
  id: string;
  name: string;
  template: Omit<TransactionRow, 'id' | 'date' | 'createdAt' | 'updatedAt' | 'dedupHash'>;
  frequency: Frequency;
  step: number;
  startDate: string;
  endDate?: string;
  nextRun: string;
  paused: boolean;
  lastRunAt?: string;
  createdAt: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface ExchangeRateRow {
  id: string; // `${from}:${to}:${source}`
  from: CurrencyCode;
  to: CurrencyCode;
  rate: string;
  quotedAt: string;
  source: string;
  cachedAt: string;
}

export class FinanzasDB extends Dexie {
  accounts!: Table<AccountRow, string>;
  transactions!: Table<TransactionRow, string>;
  categories!: Table<CategoryRow, string>;
  budgets!: Table<BudgetRow, string>;
  savingsGoals!: Table<SavingsGoalRow, string>;
  recurringRules!: Table<RecurringRuleRow, string>;
  settings!: Table<SettingRow, string>;
  exchangeRates!: Table<ExchangeRateRow, string>;

  constructor(name = 'finanzas-personales') {
    super(name);
    this.version(1).stores({
      accounts: 'id, name, type, currency, archived, order',
      transactions: 'id, accountId, date, type, categoryId, currency, dedupHash, recurringId',
      categories: 'id, name, parentId, type',
      budgets: 'id, categoryId, period, currency',
      savingsGoals: 'id, accountId',
      recurringRules: 'id, nextRun, paused',
      settings: 'key',
      exchangeRates: 'id, from, to, quotedAt, cachedAt',
    });
  }
}

export const db = new FinanzasDB();

/** Delete the whole DB. Used by the recovery screen and tests. */
export async function resetDatabase(): Promise<void> {
  await db.delete();
  await db.open();
}
