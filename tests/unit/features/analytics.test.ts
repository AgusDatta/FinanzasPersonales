import { describe, it, expect } from 'vitest';
import {
  monthlyTotals,
  budgetStatuses,
  expensesByCategory,
  generateInsights,
} from '@features/reports/analytics.ts';
import type { TransactionRow, BudgetRow, CategoryRow } from '@db/schema.ts';

const ts = new Date('2025-03-15');
const cats: CategoryRow[] = [
  { id: 'c1', name: 'Comida', icon: '🍎', color: '#f00', type: 'expense', createdAt: '' },
];
const acc = 'acc_1';
const now = new Date().toISOString();

function tx(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    id: Math.random().toString(),
    accountId: acc,
    description: 'x',
    amount: '0',
    currency: 'ARS',
    type: 'expense',
    date: '2025-03-01',
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('analytics', () => {
  it('computes monthly totals', () => {
    const txs = [
      tx({ amount: '100', type: 'income', date: '2025-03-01' }),
      tx({ amount: '30', type: 'expense', date: '2025-03-02' }),
      tx({ amount: '999', type: 'expense', date: '2025-02-20' }),
    ];
    const totals = monthlyTotals(txs, ts, 'ARS');
    expect(totals.income.toString()).toBe('100');
    expect(totals.expense.toString()).toBe('30');
    expect(totals.net.toString()).toBe('70');
  });

  it('groups expenses by category', () => {
    const txs = [
      tx({ amount: '50', categoryId: 'c1', date: '2025-03-05' }),
      tx({ amount: '25', categoryId: 'c1', date: '2025-03-10' }),
      tx({ amount: '10', date: '2025-03-11' }),
    ];
    const breakdown = expensesByCategory(txs, cats, ts, 'ARS');
    expect(breakdown.length).toBe(2);
    expect(breakdown[0].total.toString()).toBe('75');
  });

  it('flags exceeded and warning budgets', () => {
    const budgets: BudgetRow[] = [
      {
        id: 'b1',
        categoryId: 'c1',
        amount: '100',
        currency: 'ARS',
        period: 'monthly',
        startDate: '2025-03-01',
        rollover: false,
        createdAt: '',
      },
    ];
    const overBudget = [
      tx({ amount: '120', categoryId: 'c1', date: '2025-03-05' }),
    ];
    const [status] = budgetStatuses(budgets, cats, overBudget, ts);
    expect(status.level).toBe('exceeded');

    const warningTxs = [tx({ amount: '85', categoryId: 'c1', date: '2025-03-05' })];
    const [warn] = budgetStatuses(budgets, cats, warningTxs, ts);
    expect(warn.level).toBe('warning');
  });

  it('generates insights for big month-over-month changes', () => {
    const txs = [
      tx({ amount: '100', type: 'expense', date: '2025-02-10' }),
      tx({ amount: '200', type: 'expense', date: '2025-03-10' }),
      tx({ amount: '500', type: 'income', date: '2025-03-01' }),
    ];
    const insights = generateInsights(txs, cats, [], ts, 'ARS');
    expect(insights.some((i) => /más/.test(i.message))).toBe(true);
  });
});
