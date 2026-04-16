import { Money, sumMoney, type CurrencyCode } from '@domain/money.ts';
import type { TransactionRow, CategoryRow, BudgetRow } from '@db/schema.ts';
import { startOfMonth, endOfMonth, parseDate } from '@domain/date.ts';

export interface MonthlyTotals {
  income: Money;
  expense: Money;
  net: Money;
  savingsRate: number;
}

export function monthlyTotals(
  transactions: TransactionRow[],
  month: Date,
  currency: CurrencyCode,
): MonthlyTotals {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const inRange = transactions.filter((t) => {
    const d = parseDate(t.date);
    return d >= start && d <= end && t.currency === currency;
  });

  const income = sumMoney(
    inRange.filter((t) => t.type === 'income').map((t) => new Money(t.amount, currency)),
    currency,
  );
  const expense = sumMoney(
    inRange.filter((t) => t.type === 'expense').map((t) => new Money(t.amount, currency)),
    currency,
  );
  const net = income.sub(expense);
  const savingsRate = income.isZero() ? 0 : net.toNumber() / income.toNumber();
  return { income, expense, net, savingsRate };
}

export interface CategoryBreakdown {
  categoryId: string | undefined;
  categoryName: string;
  total: Money;
  percentage: number;
  color: string;
}

export function expensesByCategory(
  transactions: TransactionRow[],
  categories: CategoryRow[],
  month: Date,
  currency: CurrencyCode,
): CategoryBreakdown[] {
  const { expense } = monthlyTotals(transactions, month, currency);
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const totals = new Map<string | undefined, Money>();
  for (const t of transactions) {
    if (t.type !== 'expense' || t.currency !== currency) continue;
    const d = parseDate(t.date);
    if (d < start || d > end) continue;
    const key = t.categoryId;
    const current = totals.get(key) ?? Money.zero(currency);
    totals.set(key, current.add(new Money(t.amount, currency)));
  }

  const out: CategoryBreakdown[] = [];
  for (const [catId, total] of totals) {
    const cat = categories.find((c) => c.id === catId);
    out.push({
      categoryId: catId,
      categoryName: cat?.name ?? 'Sin categoría',
      total,
      percentage: expense.isZero() ? 0 : total.toNumber() / expense.toNumber(),
      color: cat?.color ?? '#9e9e9e',
    });
  }
  return out.sort((a, b) => b.total.compare(a.total));
}

export interface BudgetStatus {
  budget: BudgetRow;
  spent: Money;
  remaining: Money;
  ratio: number;
  level: 'ok' | 'warning' | 'exceeded';
  categoryName: string;
}

export function budgetStatuses(
  budgets: BudgetRow[],
  categories: CategoryRow[],
  transactions: TransactionRow[],
  month: Date,
): BudgetStatus[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return budgets.map((budget) => {
    const cat = categories.find((c) => c.id === budget.categoryId);
    const spent = sumMoney(
      transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.categoryId === budget.categoryId &&
            t.currency === budget.currency &&
            parseDate(t.date) >= start &&
            parseDate(t.date) <= end,
        )
        .map((t) => new Money(t.amount, budget.currency)),
      budget.currency,
    );
    const budgetAmount = new Money(budget.amount, budget.currency);
    const remaining = budgetAmount.sub(spent);
    const ratio = budgetAmount.isZero() ? 0 : spent.toNumber() / budgetAmount.toNumber();
    let level: BudgetStatus['level'] = 'ok';
    if (ratio >= 1) level = 'exceeded';
    else if (ratio >= 0.8) level = 'warning';
    return {
      budget,
      spent,
      remaining,
      ratio,
      level,
      categoryName: cat?.name ?? 'Categoría eliminada',
    };
  });
}

/** Simple next-month forecast: trailing 3-month average of expenses. */
export function forecastNextMonthExpense(
  transactions: TransactionRow[],
  currency: CurrencyCode,
  fromMonth: Date,
): Money {
  const months: Money[] = [];
  for (let i = 1; i <= 3; i++) {
    const ref = new Date(fromMonth.getFullYear(), fromMonth.getMonth() - i, 1);
    months.push(monthlyTotals(transactions, ref, currency).expense);
  }
  if (months.length === 0) return Money.zero(currency);
  const total = sumMoney(months, currency);
  return total.div(months.length);
}

export interface Insight {
  level: 'info' | 'warning' | 'success';
  message: string;
}

export function generateInsights(
  transactions: TransactionRow[],
  categories: CategoryRow[],
  budgets: BudgetRow[],
  month: Date,
  currency: CurrencyCode,
): Insight[] {
  const insights: Insight[] = [];
  const current = monthlyTotals(transactions, month, currency);
  const prev = monthlyTotals(
    transactions,
    new Date(month.getFullYear(), month.getMonth() - 1, 1),
    currency,
  );
  if (!prev.expense.isZero()) {
    const delta = current.expense.toNumber() / prev.expense.toNumber() - 1;
    if (Math.abs(delta) > 0.15) {
      const pct = Math.round(delta * 100);
      insights.push({
        level: delta > 0 ? 'warning' : 'success',
        message:
          delta > 0
            ? `Gastaste ${pct}% más que el mes pasado.`
            : `Gastaste ${Math.abs(pct)}% menos que el mes pasado. ¡Bien ahí!`,
      });
    }
  }
  if (current.savingsRate >= 0.2) {
    insights.push({
      level: 'success',
      message: `Savings rate del mes: ${Math.round(current.savingsRate * 100)}%. Excelente.`,
    });
  }
  const statuses = budgetStatuses(budgets, categories, transactions, month);
  for (const s of statuses) {
    if (s.level === 'exceeded') {
      insights.push({ level: 'warning', message: `Te pasaste del presupuesto de ${s.categoryName}.` });
    } else if (s.level === 'warning') {
      insights.push({
        level: 'warning',
        message: `Llevás ${Math.round(s.ratio * 100)}% del presupuesto de ${s.categoryName}.`,
      });
    }
  }
  return insights;
}
