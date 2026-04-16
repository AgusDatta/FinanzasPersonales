import { z } from 'zod';
import { isCurrencyCode } from './currency.ts';
import { isValidDateString, parseDate } from './date.ts';
import { Money, MoneyParseError } from './money.ts';

const TODAY_PLUS_10Y = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 10);
  return d;
};
const TODAY_MINUS_50Y = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 50);
  return d;
};

export const currencyCodeSchema = z.string().refine(isCurrencyCode, {
  message: 'Invalid currency code',
});

export const isoDateSchema = z
  .string()
  .refine(isValidDateString, { message: 'Invalid date format (expected YYYY-MM-DD)' })
  .refine(
    (s) => {
      const d = parseDate(s);
      return d >= TODAY_MINUS_50Y() && d <= TODAY_PLUS_10Y();
    },
    { message: 'Date out of reasonable range' },
  );

/** String-formatted decimal amount (positive, non-zero). For transaction amounts. */
export const amountSchema = z
  .string()
  .min(1, 'Required')
  .superRefine((val, ctx) => {
    try {
      const money = Money.parse(val, 'ARS'); // currency doesn't matter for parse validation
      if (!money.isPositive()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount must be positive' });
      }
      if (money.value.abs().greaterThan('1e15')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount too large' });
      }
    } catch (err) {
      if (err instanceof MoneyParseError) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: err.message });
      } else {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid amount' });
      }
    }
  });

/** String-formatted decimal. Allows zero and negatives. For balances. */
export const balanceAmountSchema = z
  .string()
  .min(1, 'Required')
  .superRefine((val, ctx) => {
    try {
      const money = Money.parse(val, 'ARS');
      if (money.value.abs().greaterThan('1e15')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount too large' });
      }
    } catch (err) {
      if (err instanceof MoneyParseError) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: err.message });
      } else {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid amount' });
      }
    }
  });

export const accountTypeSchema = z.enum(['bank', 'cash', 'card', 'savings']);

export const accountSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(80),
  type: accountTypeSchema,
  currency: currencyCodeSchema,
  initialBalance: balanceAmountSchema.default('0'),
  icon: z.string().max(16).default('💳'),
  archived: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

export const transactionSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1, 'Account is required'),
  description: z.string().trim().min(1, 'Description is required').max(200),
  amount: amountSchema,
  type: transactionTypeSchema,
  categoryId: z.string().optional(),
  date: isoDateSchema,
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).max(20).default([]),
  /** For transfers: the paired transaction id */
  pairId: z.string().optional(),
  /** FX snapshot when the transaction was in a different currency than the display one */
  fxSnapshot: z
    .object({
      rate: z.string(),
      displayCurrency: currencyCodeSchema,
      source: z.string(),
    })
    .optional(),
  recurringId: z.string().optional(),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(40),
  parentId: z.string().optional(),
  icon: z.string().max(16).default('📁'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color')
    .default('#607d8b'),
  type: z.enum(['income', 'expense']).default('expense'),
});

export const budgetPeriodSchema = z.enum(['weekly', 'monthly', 'yearly']);

export const budgetSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  amount: amountSchema,
  currency: currencyCodeSchema,
  period: budgetPeriodSchema.default('monthly'),
  startDate: isoDateSchema,
  rollover: z.boolean().default(false),
});

export const savingsGoalSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  target: amountSchema,
  currency: currencyCodeSchema,
  current: z.string().default('0'),
  deadline: isoDateSchema.optional(),
  accountId: z.string().optional(),
});

export const recurringFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

export const recurringRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  template: transactionSchema.omit({ id: true, date: true, recurringId: true }),
  frequency: recurringFrequencySchema,
  step: z.number().int().min(1).max(365).default(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  nextRun: isoDateSchema,
  paused: z.boolean().default(false),
});

export type AccountInput = z.infer<typeof accountSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>;

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}
