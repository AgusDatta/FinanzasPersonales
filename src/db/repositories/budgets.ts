import { db, type BudgetRow } from '../schema.ts';
import { newId } from '@domain/id.ts';
import { budgetSchema, type BudgetInput } from '@domain/validation.ts';

export async function listBudgets(): Promise<BudgetRow[]> {
  return db.budgets.toArray();
}

export async function upsertBudget(input: BudgetInput): Promise<BudgetRow> {
  const parsed = budgetSchema.parse(input);
  const row: BudgetRow = {
    id: parsed.id ?? newId('bud'),
    categoryId: parsed.categoryId,
    amount: parsed.amount,
    currency: parsed.currency,
    period: parsed.period,
    startDate: parsed.startDate,
    rollover: parsed.rollover,
    createdAt: new Date().toISOString(),
  };
  await db.budgets.put(row);
  return row;
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}
