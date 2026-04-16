import { db, type SavingsGoalRow } from '../schema.ts';
import { newId } from '@domain/id.ts';
import { savingsGoalSchema, type SavingsGoalInput } from '@domain/validation.ts';

export async function listGoals(): Promise<SavingsGoalRow[]> {
  return db.savingsGoals.toArray();
}

export async function upsertGoal(input: SavingsGoalInput): Promise<SavingsGoalRow> {
  const parsed = savingsGoalSchema.parse(input);
  const row: SavingsGoalRow = {
    id: parsed.id ?? newId('goal'),
    name: parsed.name,
    target: parsed.target,
    currency: parsed.currency,
    current: parsed.current,
    ...(parsed.deadline !== undefined ? { deadline: parsed.deadline } : {}),
    ...(parsed.accountId !== undefined ? { accountId: parsed.accountId } : {}),
    createdAt: new Date().toISOString(),
  };
  await db.savingsGoals.put(row);
  return row;
}

export async function deleteGoal(id: string): Promise<void> {
  await db.savingsGoals.delete(id);
}
