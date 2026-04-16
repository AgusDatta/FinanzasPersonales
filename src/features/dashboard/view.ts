import { el } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { Money } from '@domain/money.ts';
import { formatMoney } from '@domain/currency.ts';
import { listAccounts } from '@db/repositories/accounts.ts';
import { listTransactions } from '@db/repositories/transactions.ts';
import { listCategories } from '@db/repositories/categories.ts';
import { listBudgets } from '@db/repositories/budgets.ts';
import {
  budgetStatuses,
  expensesByCategory,
  generateInsights,
  monthlyTotals,
} from '@features/reports/analytics.ts';
import { computeBalances } from '@features/accounts/balance.ts';
import { formatDate, parseDate } from '@domain/date.ts';
import { getUserSettings } from '@db/repositories/settings.ts';
import Chart from 'chart.js/auto';

const chartInstances = new Map<string, Chart>();

export async function renderDashboard(root: HTMLElement): Promise<void> {
  root.innerHTML = '';
  const [accounts, transactions, categories, budgets, settings] = await Promise.all([
    listAccounts(),
    listTransactions(),
    listCategories(),
    listBudgets(),
    getUserSettings(),
  ]);

  const now = new Date();
  const totals = monthlyTotals(transactions, now, settings.displayCurrency);
  const breakdown = expensesByCategory(transactions, categories, now, settings.displayCurrency);
  const insights = generateInsights(transactions, categories, budgets, now, settings.displayCurrency);
  const budgetList = budgetStatuses(budgets, categories, transactions, now);
  const balances = computeBalances(accounts, transactions);

  const kpis = el('section', { class: 'kpis' });
  kpis.appendChild(kpiCard(t('summary.total'), sumBalances(balances, settings.displayCurrency)));
  kpis.appendChild(kpiCard(t('summary.income') + ' (mes)', totals.income));
  kpis.appendChild(kpiCard(t('summary.expense') + ' (mes)', totals.expense, 'expense'));
  kpis.appendChild(kpiCard(t('summary.savings') + ' (mes)', totals.net, totals.net.isNegative() ? 'expense' : 'income'));
  root.appendChild(kpis);

  if (insights.length > 0) {
    const insightList = el('section', { class: 'insights' });
    insightList.appendChild(el('h2', { class: 'section-title' }, ['💡 Insights']));
    const ul = el('ul', { class: 'insights__list' });
    for (const i of insights) {
      ul.appendChild(el('li', { class: `insight insight--${i.level}` }, [i.message]));
    }
    insightList.appendChild(ul);
    root.appendChild(insightList);
  }

  if (budgetList.length > 0) {
    const sec = el('section', { class: 'budgets-summary' });
    sec.appendChild(el('h2', { class: 'section-title' }, ['Presupuestos']));
    for (const b of budgetList) {
      const row = el('div', { class: `budget-row budget-row--${b.level}` });
      row.appendChild(el('span', { class: 'budget-row__label' }, [b.categoryName]));
      const pct = Math.min(100, Math.round(b.ratio * 100));
      const bar = el('div', { class: 'budget-row__bar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemax': '100' });
      const fill = el('div', { class: 'budget-row__fill', style: `width:${pct}%` });
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('span', { class: 'budget-row__pct' }, [`${pct}%`]));
      sec.appendChild(row);
    }
    root.appendChild(sec);
  }

  const chartsSection = el('section', { class: 'charts' });
  chartsSection.appendChild(el('h2', { class: 'section-title' }, ['Distribución']));
  const doughnutWrap = el('div', { class: 'chart-wrap' });
  const doughnutCanvas = el('canvas', { id: 'chart-doughnut' });
  doughnutWrap.appendChild(doughnutCanvas);
  chartsSection.appendChild(doughnutWrap);
  root.appendChild(chartsSection);

  const recentSection = el('section', { class: 'recent' });
  recentSection.appendChild(el('h2', { class: 'section-title' }, ['Movimientos recientes']));
  const recentList = el('ul', { class: 'tx-list', role: 'list' });
  for (const tx of transactions.slice(0, 10)) {
    const money = new Money(tx.amount, tx.currency);
    const sign = tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '↔';
    const li = el('li', { class: `tx tx--${tx.type}` });
    li.appendChild(el('span', { class: 'tx__desc' }, [tx.description]));
    li.appendChild(el('span', { class: 'tx__meta' }, [formatDate(parseDate(tx.date))]));
    li.appendChild(el('span', { class: 'tx__amount' }, [`${sign} ${formatMoney(money)}`]));
    recentList.appendChild(li);
  }
  if (transactions.length === 0) {
    recentList.appendChild(el('li', { class: 'empty' }, [t('empty.transactions')]));
  }
  recentSection.appendChild(recentList);
  root.appendChild(recentSection);

  renderDoughnut(doughnutCanvas, breakdown);
}

function kpiCard(label: string, amount: Money, variant: 'income' | 'expense' | 'neutral' = 'neutral'): HTMLElement {
  const card = el('article', { class: `kpi kpi--${variant}` });
  card.appendChild(el('span', { class: 'kpi__label' }, [label]));
  card.appendChild(el('strong', { class: 'kpi__value' }, [formatMoney(amount)]));
  return card;
}

function sumBalances(balances: Map<string, Money>, _displayCurrency: string): Money {
  // Same-currency sum only; cross-currency would need rates.
  const first = balances.values().next().value;
  if (!first) return Money.zero('ARS');
  let out = Money.zero(first.currency);
  for (const [, b] of balances) {
    if (b.currency !== out.currency) continue;
    out = out.add(b);
  }
  return out;
}

function renderDoughnut(canvas: HTMLCanvasElement, breakdown: ReturnType<typeof expensesByCategory>): void {
  const prev = chartInstances.get('doughnut');
  if (prev) prev.destroy();
  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: breakdown.map((b) => b.categoryName),
      datasets: [
        {
          data: breakdown.map((b) => b.total.toNumber()),
          backgroundColor: breakdown.map((b) => b.color),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  });
  chartInstances.set('doughnut', chart);
}
