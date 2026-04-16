import { el } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { toast } from '@ui/toast.ts';
import { toISODate } from '@domain/date.ts';
import type { AccountRow, CategoryRow, TransactionRow } from '@db/schema.ts';
import type { TransactionInput } from '@domain/validation.ts';
import { transactionSchema, formatZodErrors } from '@domain/validation.ts';
import { friendlyMessage } from '@ui/error-handler.ts';

interface BuildArgs {
  accounts: AccountRow[];
  categories: CategoryRow[];
  initial?: Partial<TransactionRow>;
  onSubmit: (input: TransactionInput) => Promise<void>;
}

export interface TransactionFormInstance {
  element: HTMLElement;
  onCancel: () => void;
  onDone: () => void;
}

export function buildTransactionForm(args: BuildArgs): TransactionFormInstance {
  const form = el('form', { class: 'tx-form' });
  const initial = args.initial ?? {};

  form.innerHTML = `
    <label class="field">
      <span>${t('field.description')}</span>
      <input name="description" required maxlength="200" />
      <small data-error="description"></small>
    </label>
    <div class="field-row">
      <label class="field">
        <span>${t('field.amount')}</span>
        <input name="amount" inputmode="decimal" required />
        <small data-error="amount"></small>
      </label>
      <label class="field">
        <span>${t('field.type')}</span>
        <select name="type">
          <option value="expense">${t('type.expense')}</option>
          <option value="income">${t('type.income')}</option>
        </select>
      </label>
    </div>
    <div class="field-row">
      <label class="field">
        <span>${t('field.account')}</span>
        <select name="accountId" required></select>
      </label>
      <label class="field">
        <span>${t('field.category')}</span>
        <select name="categoryId"></select>
      </label>
    </div>
    <div class="field-row">
      <label class="field">
        <span>${t('field.date')}</span>
        <input type="date" name="date" required />
      </label>
    </div>
    <label class="field">
      <span>${t('field.notes')}</span>
      <textarea name="notes" maxlength="500" rows="2"></textarea>
    </label>
    <div class="form-actions">
      <button type="button" class="btn btn--ghost" data-action="cancel">${t('action.cancel')}</button>
      <button type="submit" class="btn btn--primary">${t('action.save')}</button>
    </div>
  `;

  const accSelect = form.querySelector<HTMLSelectElement>('select[name=accountId]')!;
  for (const acc of args.accounts) {
    accSelect.appendChild(el('option', { value: acc.id }, [`${acc.icon} ${acc.name} (${acc.currency})`]));
  }

  const typeSelect = form.querySelector<HTMLSelectElement>('select[name=type]')!;
  const catSelect = form.querySelector<HTMLSelectElement>('select[name=categoryId]')!;
  const populateCategories = () => {
    const type = typeSelect.value as 'income' | 'expense';
    catSelect.innerHTML = '<option value="">—</option>';
    for (const c of args.categories.filter((c) => c.type === type)) {
      catSelect.appendChild(el('option', { value: c.id }, [`${c.icon} ${c.name}`]));
    }
  };
  populateCategories();
  typeSelect.addEventListener('change', populateCategories);

  (form.elements.namedItem('description') as HTMLInputElement).value = initial.description ?? '';
  (form.elements.namedItem('amount') as HTMLInputElement).value = initial.amount ?? '';
  (form.elements.namedItem('type') as HTMLSelectElement).value = initial.type ?? 'expense';
  populateCategories();
  (form.elements.namedItem('accountId') as HTMLSelectElement).value =
    initial.accountId ?? (args.accounts[0]?.id ?? '');
  (form.elements.namedItem('date') as HTMLInputElement).value = initial.date ?? toISODate(new Date());
  if (initial.categoryId) (form.elements.namedItem('categoryId') as HTMLSelectElement).value = initial.categoryId;
  if (initial.notes) (form.elements.namedItem('notes') as HTMLTextAreaElement).value = initial.notes;

  const instance: TransactionFormInstance = {
    element: form,
    onCancel: () => {},
    onDone: () => {},
  };

  form.querySelector<HTMLButtonElement>('[data-action=cancel]')!.addEventListener('click', () => {
    instance.onCancel();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      // Clear previous errors
      form.querySelectorAll('[data-error]').forEach((n) => (n.textContent = ''));
      const fd = new FormData(form);
      const input: TransactionInput = {
        description: String(fd.get('description') ?? ''),
        amount: String(fd.get('amount') ?? ''),
        type: String(fd.get('type') ?? 'expense') as TransactionInput['type'],
        accountId: String(fd.get('accountId') ?? ''),
        date: String(fd.get('date') ?? ''),
        tags: [],
      };
      const catId = String(fd.get('categoryId') ?? '');
      if (catId) input.categoryId = catId;
      const notes = String(fd.get('notes') ?? '').trim();
      if (notes) input.notes = notes;

      const result = transactionSchema.safeParse(input);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        for (const [field, msg] of Object.entries(errors)) {
          const target = form.querySelector(`[data-error="${field}"]`);
          if (target) target.textContent = msg;
        }
        return;
      }
      try {
        await args.onSubmit(result.data);
        instance.onDone();
      } catch (err) {
        toast(friendlyMessage(err), { level: 'error' });
      }
    })();
  });

  return instance;
}
