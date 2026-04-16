import { el } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { listTransactions } from '@db/repositories/transactions.ts';
import { listCategories } from '@db/repositories/categories.ts';
import { listBudgets } from '@db/repositories/budgets.ts';
import { getUserSettings } from '@db/repositories/settings.ts';
import { monthlyTotals, expensesByCategory, forecastNextMonthExpense } from './analytics.ts';
import { formatMoney } from '@domain/currency.ts';
import { downloadBlob, exportAsCSV, exportAsJSON } from '@features/import-export/export.ts';
import { listAccounts } from '@db/repositories/accounts.ts';
import Chart from 'chart.js/auto';

let chartInstance: Chart | null = null;

export async function renderReports(root: HTMLElement): Promise<void> {
  root.innerHTML = '';
  const [transactions, categories, budgets, settings, accounts] = await Promise.all([
    listTransactions(),
    listCategories(),
    listBudgets(),
    getUserSettings(),
    listAccounts(true),
  ]);

  const header = el('header', { class: 'view__header' });
  header.appendChild(el('h1', { class: 'view__title' }, [t('nav.reports')]));
  const exportBtns = el('div', { class: 'export-actions' });
  const csvBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, ['CSV']);
  csvBtn.addEventListener('click', () => downloadBlob(exportAsCSV(transactions), 'finanzas.csv'));
  const jsonBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, ['JSON']);
  jsonBtn.addEventListener('click', () =>
    downloadBlob(exportAsJSON(accounts, categories, transactions), 'finanzas.json'),
  );
  exportBtns.append(csvBtn, jsonBtn);
  header.appendChild(exportBtns);
  root.appendChild(header);

  const months: Date[] = [];
  for (let i = 11; i >= 0; i--) {
    months.push(new Date(new Date().getFullYear(), new Date().getMonth() - i, 1));
  }
  const expenses = months.map((m) => monthlyTotals(transactions, m, settings.displayCurrency).expense);
  const income = months.map((m) => monthlyTotals(transactions, m, settings.displayCurrency).income);

  const canvas = el('canvas', { id: 'reports-chart' });
  root.appendChild(canvas);
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: months.map((m) => m.toLocaleDateString(settings.locale, { month: 'short', year: '2-digit' })),
      datasets: [
        { label: t('summary.income'), data: income.map((m) => m.toNumber()), borderColor: '#2e7d32', tension: 0.3 },
        { label: t('summary.expense'), data: expenses.map((m) => m.toNumber()), borderColor: '#c62828', tension: 0.3 },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });

  const forecast = forecastNextMonthExpense(transactions, settings.displayCurrency, new Date());
  root.appendChild(
    el('p', { class: 'forecast' }, [
      `📈 Forecast del próximo mes (gastos estimados): ${formatMoney(forecast, settings.locale)}`,
    ]),
  );

  const breakdown = expensesByCategory(transactions, categories, new Date(), settings.displayCurrency);
  const list = el('ul', { class: 'breakdown-list' });
  for (const b of breakdown) {
    const li = el('li', { class: 'breakdown-row' });
    li.appendChild(el('span', { class: 'breakdown-row__name' }, [b.categoryName]));
    li.appendChild(el('span', { class: 'breakdown-row__amount' }, [formatMoney(b.total, settings.locale)]));
    li.appendChild(el('span', { class: 'breakdown-row__pct' }, [`${Math.round(b.percentage * 100)}%`]));
    list.appendChild(li);
  }
  if (breakdown.length > 0) root.appendChild(list);

  if (budgets.length > 0) {
    root.appendChild(el('p', { class: 'hint' }, [`Presupuestos activos: ${budgets.length}`]));
  }
}
