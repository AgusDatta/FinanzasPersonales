import { el } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { toast } from '@ui/toast.ts';
import { openModal, confirmDialog } from '@ui/modal.ts';
import { listBudgets, upsertBudget, deleteBudget } from '@db/repositories/budgets.ts';
import { listCategories } from '@db/repositories/categories.ts';
import { listTransactions } from '@db/repositories/transactions.ts';
import { budgetStatuses } from '@features/reports/analytics.ts';
import { formatMoney, CURRENCIES } from '@domain/currency.ts';
import { Money } from '@domain/money.ts';
import { budgetSchema, formatZodErrors, type BudgetInput } from '@domain/validation.ts';
import { toISODate } from '@domain/date.ts';
import { broadcastChange } from '@ui/broadcast.ts';

export async function renderBudgets(root: HTMLElement): Promise<void> {
  root.innerHTML = '';
  const [budgets, categories, transactions] = await Promise.all([
    listBudgets(),
    listCategories(),
    listTransactions(),
  ]);
  const statuses = budgetStatuses(budgets, categories, transactions, new Date());

  const header = el('header', { class: 'view__header' });
  header.appendChild(el('h1', { class: 'view__title' }, [t('nav.budgets')]));
  const addBtn = el('button', { type: 'button', class: 'btn btn--primary' }, ['+ ' + t('action.add')]);
  addBtn.addEventListener('click', () => openBudgetDialog(categories, () => renderBudgets(root)));
  header.appendChild(addBtn);
  root.appendChild(header);

  if (budgets.length === 0) {
    root.appendChild(el('p', { class: 'empty' }, ['Todavía no hay presupuestos. Creá uno para empezar a monitorear tus gastos.']));
    return;
  }

  const list = el('div', { class: 'budgets-list' });
  for (const s of statuses) {
    const card = el('article', { class: `budget-card budget-card--${s.level}` });
    card.appendChild(el('h3', { class: 'budget-card__name' }, [s.categoryName]));
    const meta = el('p', { class: 'budget-card__meta' });
    meta.textContent = `${formatMoney(s.spent)} / ${formatMoney(new Money(s.budget.amount, s.budget.currency))}`;
    card.appendChild(meta);
    const pct = Math.min(100, Math.round(s.ratio * 100));
    const bar = el('div', { class: 'budget-row__bar' });
    bar.appendChild(el('div', { class: 'budget-row__fill', style: `width:${pct}%` }));
    card.appendChild(bar);
    const del = el('button', { type: 'button', class: 'btn btn--ghost btn--danger' }, ['Eliminar']);
    del.addEventListener('click', async () => {
      const ok = await confirmDialog(`¿Eliminar presupuesto de ${s.categoryName}?`);
      if (!ok) return;
      await deleteBudget(s.budget.id);
      broadcastChange();
      await renderBudgets(root);
    });
    card.appendChild(del);
    list.appendChild(card);
  }
  root.appendChild(list);
}

function openBudgetDialog(categories: Awaited<ReturnType<typeof listCategories>>, onSaved: () => void): void {
  const form = el('form', { class: 'tx-form' });
  form.innerHTML = `
    <label class="field">
      <span>${t('field.category')}</span>
      <select name="categoryId" required></select>
    </label>
    <div class="field-row">
      <label class="field">
        <span>${t('field.amount')}</span>
        <input name="amount" inputmode="decimal" required />
        <small data-error="amount"></small>
      </label>
      <label class="field">
        <span>${t('field.currency')}</span>
        <select name="currency"></select>
      </label>
    </div>
    <label class="field">
      <span>Período</span>
      <select name="period">
        <option value="monthly">Mensual</option>
        <option value="weekly">Semanal</option>
        <option value="yearly">Anual</option>
      </select>
    </label>
    <div class="form-actions">
      <button type="button" class="btn btn--ghost" data-action="cancel">${t('action.cancel')}</button>
      <button type="submit" class="btn btn--primary">${t('action.save')}</button>
    </div>
  `;

  const catSelect = form.querySelector<HTMLSelectElement>('select[name=categoryId]')!;
  for (const c of categories.filter((c) => c.type === 'expense')) {
    catSelect.appendChild(el('option', { value: c.id }, [`${c.icon} ${c.name}`]));
  }
  const curSelect = form.querySelector<HTMLSelectElement>('select[name=currency]')!;
  for (const [code] of Object.entries(CURRENCIES)) {
    curSelect.appendChild(el('option', { value: code }, [code]));
  }

  const { close } = openModal({ title: 'Nuevo presupuesto', content: form });
  form.querySelector<HTMLButtonElement>('[data-action=cancel]')!.addEventListener('click', close);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      const fd = new FormData(form);
      const input: BudgetInput = {
        categoryId: String(fd.get('categoryId') ?? ''),
        amount: String(fd.get('amount') ?? ''),
        currency: String(fd.get('currency') ?? 'ARS') as BudgetInput['currency'],
        period: String(fd.get('period') ?? 'monthly') as BudgetInput['period'],
        startDate: toISODate(new Date()),
        rollover: false,
      };
      const parsed = budgetSchema.safeParse(input);
      if (!parsed.success) {
        const errors = formatZodErrors(parsed.error);
        for (const [field, msg] of Object.entries(errors)) {
          const target = form.querySelector(`[data-error="${field}"]`);
          if (target) target.textContent = msg;
        }
        return;
      }
      await upsertBudget(parsed.data);
      broadcastChange();
      toast('Presupuesto creado.', { level: 'success' });
      close();
      onSaved();
    })();
  });
}
