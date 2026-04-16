import { db, type RecurringRuleRow } from '../schema.ts';
import { newId } from '@domain/id.ts';
import { nextOccurrence, parseDate, toISODate } from '@domain/date.ts';
import { recurringRuleSchema, type RecurringRuleInput } from '@domain/validation.ts';
import { createTransaction } from './transactions.ts';

export async function listRecurringRules(): Promise<RecurringRuleRow[]> {
  return db.recurringRules.toArray();
}

export async function upsertRecurringRule(input: RecurringRuleInput): Promise<RecurringRuleRow> {
  const parsed = recurringRuleSchema.parse(input);
  const row: RecurringRuleRow = {
    id: parsed.id ?? newId('rec'),
    name: parsed.name,
    template: parsed.template as RecurringRuleRow['template'],
    frequency: parsed.frequency,
    step: parsed.step,
    startDate: parsed.startDate,
    ...(parsed.endDate !== undefined ? { endDate: parsed.endDate } : {}),
    nextRun: parsed.nextRun,
    paused: parsed.paused,
    createdAt: new Date().toISOString(),
  };
  await db.recurringRules.put(row);
  return row;
}

export async function deleteRecurringRule(id: string): Promise<void> {
  await db.recurringRules.delete(id);
}

/**
 * Run all due rules (nextRun <= today). For each, create the transaction
 * and advance nextRun until it's in the future. Idempotent per day.
 */
export async function runDueRecurrences(today: Date = new Date()): Promise<number> {
  const todayISO = toISODate(today);
  const rules = await db.recurringRules.toArray();
  let generated = 0;
  for (const rule of rules) {
    if (rule.paused) continue;
    if (rule.endDate && rule.endDate < todayISO) continue;

    while (rule.nextRun <= todayISO) {
      await createTransaction({
        ...rule.template,
        date: rule.nextRun,
        recurringId: rule.id,
      });
      generated++;
      const advanced = nextOccurrence(parseDate(rule.nextRun), rule.frequency, rule.step);
      rule.nextRun = toISODate(advanced);
      rule.lastRunAt = new Date().toISOString();
      if (rule.endDate && rule.nextRun > rule.endDate) break;
    }
    await db.recurringRules.put(rule);
  }
  return generated;
}
