import { el } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { toast } from '@ui/toast.ts';
import { openModal, confirmDialog } from '@ui/modal.ts';
import {
  deleteRecurringRule,
  listRecurringRules,
  upsertRecurringRule,
} from '@db/repositories/recurring.ts';
import { listAccounts } from '@db/repositories/accounts.ts';
import { listCategories } from '@db/repositories/categories.ts';
import { toISODate } from '@domain/date.ts';
import { recurringRuleSchema, type RecurringRuleInput, formatZodErrors } from '@domain/validation.ts';
import { broadcastChange } from '@ui/broadcast.ts';

export async function renderRecurring(root: HTMLElement): Promise<void> {
  root.innerHTML = '';
  const [rules, accounts, categories] = await Promise.all([
    listRecurringRules(),
    listAccounts(),
    listCategories(),
  ]);
  const header = el('header', { class: 'view__header' });
  header.appendChild(el('h1', { class: 'view__title' }, [t('nav.recurring')]));
  const add = el('button', { type: 'button', class: 'btn btn--primary' }, ['+ ' + t('action.add')]);
  add.addEventListener('click', () => openDialog(accounts, categories, () => renderRecurring(root)));
  header.appendChild(add);
  root.appendChild(header);

  if (rules.length === 0) {
    root.appendChild(el('p', { class: 'empty' }, ['No hay reglas recurrentes. Creá una para tu sueldo o suscripciones.']));
    return;
  }

  const list = el('ul', { class: 'recurring-list', role: 'list' });
  for (const rule of rules) {
    const li = el('li', { class: `recurring-row${rule.paused ? ' recurring-row--paused' : ''}` });
    li.appendChild(el('strong', {}, [rule.name]));
    li.appendChild(el('span', { class: 'recurring-row__meta' }, [`${rule.frequency} · próxima: ${rule.nextRun}`]));
    const pauseBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, [rule.paused ? 'Reanudar' : 'Pausar']);
    pauseBtn.addEventListener('click', async () => {
      await upsertRecurringRule({ ...rule, paused: !rule.paused });
      broadcastChange();
      await renderRecurring(root);
    });
    const delBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--danger' }, ['Eliminar']);
    delBtn.addEventListener('click', async () => {
      const ok = await confirmDialog(`¿Eliminar "${rule.name}"?`);
      if (!ok) return;
      await deleteRecurringRule(rule.id);
      broadcastChange();
      await renderRecurring(root);
    });
    li.append(pauseBtn, delBtn);
    list.appendChild(li);
  }
  root.appendChild(list);
}

function openDialog(
  accounts: Awaited<ReturnType<typeof listAccounts>>,
  categories: Awaited<ReturnType<typeof listCategories>>,
  onSaved: () => void,
): void {
  const form = el('form', { class: 'tx-form' });
  form.innerHTML = `
    <label class="field"><span>Nombre</span><input name="name" required maxlength="80" /></label>
    <label class="field"><span>Descripción</span><input name="description" required /></label>
    <div class="field-row">
      <label class="field"><span>${t('field.amount')}</span><input name="amount" inputmode="decimal" required /></label>
      <label class="field">
        <span>${t('field.type')}</span>
        <select name="type"><option value="income">${t('type.income')}</option><option value="expense">${t('type.expense')}</option></select>
      </label>
    </div>
    <div class="field-row">
      <label class="field"><span>${t('field.account')}</span><select name="accountId"></select></label>
      <label class="field"><span>${t('field.category')}</span><select name="categoryId"></select></label>
    </div>
    <div class="field-row">
      <label class="field"><span>Frecuencia</span>
        <select name="frequency">
          <option value="monthly">Mensual</option>
          <option value="weekly">Semanal</option>
          <option value="daily">Diaria</option>
          <option value="yearly">Anual</option>
        </select>
      </label>
      <label class="field"><span>Primer ejecución</span><input type="date" name="startDate" required /></label>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn--ghost" data-action="cancel">${t('action.cancel')}</button>
      <button type="submit" class="btn btn--primary">${t('action.save')}</button>
    </div>
  `;
  const accSel = form.querySelector<HTMLSelectElement>('select[name=accountId]')!;
  for (const a of accounts) accSel.appendChild(el('option', { value: a.id }, [`${a.icon} ${a.name}`]));
  const catSel = form.querySelector<HTMLSelectElement>('select[name=categoryId]')!;
  for (const c of categories) catSel.appendChild(el('option', { value: c.id }, [`${c.icon} ${c.name}`]));
  (form.elements.namedItem('startDate') as HTMLInputElement).value = toISODate(new Date());

  const { close } = openModal({ title: 'Nueva regla recurrente', content: form });
  form.querySelector<HTMLButtonElement>('[data-action=cancel]')!.addEventListener('click', close);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      const fd = new FormData(form);
      const start = String(fd.get('startDate') ?? '');
      const accountId = String(fd.get('accountId') ?? '');
      const categoryId = String(fd.get('categoryId') ?? '');
      const input: RecurringRuleInput = {
        name: String(fd.get('name') ?? ''),
        template: {
          accountId,
          description: String(fd.get('description') ?? ''),
          amount: String(fd.get('amount') ?? ''),
          type: String(fd.get('type') ?? 'expense') as 'income' | 'expense' | 'transfer',
          ...(categoryId ? { categoryId } : {}),
          tags: [],
        },
        frequency: String(fd.get('frequency') ?? 'monthly') as RecurringRuleInput['frequency'],
        step: 1,
        startDate: start,
        nextRun: start,
        paused: false,
      };
      const parsed = recurringRuleSchema.safeParse(input);
      if (!parsed.success) {
        console.warn(formatZodErrors(parsed.error));
        toast('Revisá los datos del formulario.', { level: 'warning' });
        return;
      }
      await upsertRecurringRule(parsed.data);
      broadcastChange();
      toast('Regla creada.', { level: 'success' });
      close();
      onSaved();
    })();
  });
}
