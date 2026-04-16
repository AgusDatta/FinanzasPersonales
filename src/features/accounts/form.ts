import { el } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { accountSchema, type AccountInput, formatZodErrors } from '@domain/validation.ts';
import { CURRENCIES } from '@domain/currency.ts';
import { toast } from '@ui/toast.ts';
import { friendlyMessage } from '@ui/error-handler.ts';

interface BuildArgs {
  onSubmit: (input: AccountInput) => Promise<void>;
  initial?: Partial<AccountInput>;
}

export function buildAccountForm(args: BuildArgs): { element: HTMLElement; onCancel: () => void; onDone: () => void } {
  const form = el('form', { class: 'tx-form' });
  form.innerHTML = `
    <label class="field">
      <span>Nombre</span>
      <input name="name" required maxlength="80" />
      <small data-error="name"></small>
    </label>
    <div class="field-row">
      <label class="field">
        <span>Tipo</span>
        <select name="type">
          <option value="bank">Banco</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="savings">Ahorro</option>
        </select>
      </label>
      <label class="field">
        <span>${t('field.currency')}</span>
        <select name="currency" required></select>
      </label>
    </div>
    <label class="field">
      <span>Saldo inicial</span>
      <input name="initialBalance" inputmode="decimal" value="0" />
      <small data-error="initialBalance"></small>
    </label>
    <label class="field">
      <span>Icono</span>
      <input name="icon" maxlength="4" value="💳" />
    </label>
    <div class="form-actions">
      <button type="button" class="btn btn--ghost" data-action="cancel">${t('action.cancel')}</button>
      <button type="submit" class="btn btn--primary">${t('action.save')}</button>
    </div>
  `;

  const currencySelect = form.querySelector<HTMLSelectElement>('select[name=currency]')!;
  for (const [code, meta] of Object.entries(CURRENCIES)) {
    currencySelect.appendChild(el('option', { value: code }, [`${code} — ${meta.name}`]));
  }
  if (args.initial?.currency) currencySelect.value = args.initial.currency;
  if (args.initial?.type) (form.elements.namedItem('type') as HTMLSelectElement).value = args.initial.type;
  if (args.initial?.name) (form.elements.namedItem('name') as HTMLInputElement).value = args.initial.name;
  if (args.initial?.icon) (form.elements.namedItem('icon') as HTMLInputElement).value = args.initial.icon;

  const inst = { element: form, onCancel: () => {}, onDone: () => {} };
  form.querySelector<HTMLButtonElement>('[data-action=cancel]')!.addEventListener('click', () => inst.onCancel());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      form.querySelectorAll('[data-error]').forEach((n) => (n.textContent = ''));
      const fd = new FormData(form);
      const input = {
        name: String(fd.get('name') ?? ''),
        type: String(fd.get('type') ?? 'bank') as AccountInput['type'],
        currency: String(fd.get('currency') ?? 'ARS') as AccountInput['currency'],
        initialBalance: String(fd.get('initialBalance') ?? '0'),
        icon: String(fd.get('icon') ?? '💳'),
        archived: false,
      };
      const result = accountSchema.safeParse(input);
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
        inst.onDone();
      } catch (err) {
        toast(friendlyMessage(err), { level: 'error' });
      }
    })();
  });
  return inst;
}
