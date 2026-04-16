import { el } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { toast } from '@ui/toast.ts';
import { openModal, confirmDialog } from '@ui/modal.ts';
import { formatMoney } from '@domain/currency.ts';
import { Money } from '@domain/money.ts';
import {
  archiveAccount,
  createAccount,
  deleteAccount,
  listAccounts,
} from '@db/repositories/accounts.ts';
import { listTransactions } from '@db/repositories/transactions.ts';
import { computeBalances } from './balance.ts';
import { buildAccountForm } from './form.ts';
import { broadcastChange } from '@ui/broadcast.ts';
import { friendlyMessage } from '@ui/error-handler.ts';

export async function renderAccounts(root: HTMLElement): Promise<void> {
  root.innerHTML = '';
  const [accounts, transactions] = await Promise.all([listAccounts(true), listTransactions()]);
  const active = accounts.filter((a) => !a.archived);
  const balances = computeBalances(accounts, transactions);

  const header = el('header', { class: 'view__header' });
  header.appendChild(el('h1', { class: 'view__title' }, [t('nav.accounts')]));
  const addBtn = el('button', { type: 'button', class: 'btn btn--primary' }, ['+ ' + t('action.add')]);
  addBtn.addEventListener('click', () => {
    const form = buildAccountForm({
      onSubmit: async (input) => {
        await createAccount(input);
        broadcastChange();
        toast('Cuenta creada.', { level: 'success' });
        await renderAccounts(root);
      },
    });
    const { close } = openModal({ title: 'Nueva cuenta', content: form.element });
    form.onCancel = close;
    form.onDone = close;
  });
  header.appendChild(addBtn);
  root.appendChild(header);

  if (active.length === 0) {
    root.appendChild(el('p', { class: 'empty' }, [t('empty.accounts')]));
    return;
  }

  const grid = el('div', { class: 'accounts-grid' });
  for (const acc of accounts) {
    const balance = balances.get(acc.id) ?? Money.zero(acc.currency);
    const card = el('article', { class: `account-card${acc.archived ? ' account-card--archived' : ''}` });
    card.appendChild(el('span', { class: 'account-card__icon' }, [acc.icon]));
    card.appendChild(el('h3', { class: 'account-card__name' }, [acc.name]));
    card.appendChild(el('span', { class: 'account-card__type' }, [acc.type]));
    card.appendChild(el('strong', { class: 'account-card__balance' }, [formatMoney(balance)]));

    const actions = el('div', { class: 'account-card__actions' });
    const archBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, [
      acc.archived ? 'Desarchivar' : 'Archivar',
    ]);
    archBtn.addEventListener('click', async () => {
      await archiveAccount(acc.id, !acc.archived);
      broadcastChange();
      await renderAccounts(root);
    });
    const delBtn = el('button', { type: 'button', class: 'btn btn--danger btn--ghost' }, ['Eliminar']);
    delBtn.addEventListener('click', async () => {
      const ok = await confirmDialog(`¿Eliminar la cuenta "${acc.name}"?`);
      if (!ok) return;
      try {
        await deleteAccount(acc.id);
        broadcastChange();
        toast('Cuenta eliminada.', { level: 'success' });
        await renderAccounts(root);
      } catch (err) {
        toast(friendlyMessage(err), { level: 'warning' });
      }
    });
    actions.append(archBtn, delBtn);
    card.appendChild(actions);
    grid.appendChild(card);
  }
  root.appendChild(grid);
}
