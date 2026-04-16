import { el, escapeHtml } from '@utils/dom.ts';
import { t } from '@ui/i18n.ts';
import { toast } from '@ui/toast.ts';
import { openModal, confirmDialog } from '@ui/modal.ts';
import { formatDate, parseDate } from '@domain/date.ts';
import { formatMoney } from '@domain/currency.ts';
import { Money } from '@domain/money.ts';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '@db/repositories/transactions.ts';
import { listAccounts } from '@db/repositories/accounts.ts';
import { listCategories } from '@db/repositories/categories.ts';
import type { TransactionRow, AccountRow, CategoryRow } from '@db/schema.ts';
import { buildTransactionForm } from './form.ts';
import { broadcastChange } from '@ui/broadcast.ts';

interface ViewState {
  search: string;
  from: string;
  to: string;
  accountId: string;
  type: '' | 'income' | 'expense' | 'transfer';
}

const state: ViewState = { search: '', from: '', to: '', accountId: '', type: '' };

export async function renderTransactions(root: HTMLElement): Promise<void> {
  root.innerHTML = '';
  const [accounts, categories, transactions] = await Promise.all([
    listAccounts(),
    listCategories(),
    listTransactions(buildFilter()),
  ]);

  const header = el('header', { class: 'view__header' }, []);
  header.appendChild(el('h1', { class: 'view__title' }, [t('nav.transactions')]));
  const addBtn = el('button', { type: 'button', class: 'btn btn--primary' }, ['+ ' + t('action.add')]);
  addBtn.addEventListener('click', () => openAddDialog(accounts, categories, () => renderTransactions(root)));
  header.appendChild(addBtn);
  root.appendChild(header);

  root.appendChild(renderFilters(accounts, () => renderTransactions(root)));

  if (accounts.length === 0) {
    root.appendChild(el('p', { class: 'empty' }, [t('empty.accounts')]));
    return;
  }

  if (transactions.length === 0) {
    root.appendChild(el('p', { class: 'empty' }, [t('empty.transactions')]));
    return;
  }

  const list = el('ul', { class: 'tx-list', role: 'list' });
  for (const tx of transactions) {
    list.appendChild(renderTransactionRow(tx, accounts, categories, () => renderTransactions(root)));
  }
  root.appendChild(list);
}

function buildFilter(): Parameters<typeof listTransactions>[0] {
  const filter: Record<string, string | undefined> = {};
  if (state.from) filter.from = state.from;
  if (state.to) filter.to = state.to;
  if (state.accountId) filter.accountId = state.accountId;
  if (state.type) filter.type = state.type;
  if (state.search) filter.search = state.search;
  return filter;
}

function renderFilters(accounts: AccountRow[], onChange: () => void): HTMLElement {
  const form = el('form', { class: 'filters', role: 'search' });
  const search = el('input', {
    type: 'search',
    placeholder: 'Buscar…',
    'aria-label': 'Buscar movimientos',
    class: 'filter__input',
    value: state.search,
  });
  search.addEventListener('input', () => {
    state.search = search.value;
    void onChange();
  });

  const from = el('input', { type: 'date', 'aria-label': 'Desde', value: state.from });
  from.addEventListener('change', () => {
    state.from = from.value;
    void onChange();
  });

  const to = el('input', { type: 'date', 'aria-label': 'Hasta', value: state.to });
  to.addEventListener('change', () => {
    state.to = to.value;
    void onChange();
  });

  const accountSelect = el('select', { 'aria-label': 'Cuenta' });
  accountSelect.appendChild(el('option', { value: '' }, ['Todas las cuentas']));
  for (const acc of accounts) {
    const opt = el('option', { value: acc.id }, [`${acc.icon} ${acc.name}`]);
    if (acc.id === state.accountId) opt.setAttribute('selected', '');
    accountSelect.appendChild(opt);
  }
  accountSelect.addEventListener('change', () => {
    state.accountId = accountSelect.value;
    void onChange();
  });

  const typeSelect = el('select', { 'aria-label': 'Tipo' });
  typeSelect.innerHTML = `
    <option value="">Todos</option>
    <option value="income" ${state.type === 'income' ? 'selected' : ''}>${escapeHtml(t('type.income'))}</option>
    <option value="expense" ${state.type === 'expense' ? 'selected' : ''}>${escapeHtml(t('type.expense'))}</option>
    <option value="transfer" ${state.type === 'transfer' ? 'selected' : ''}>${escapeHtml(t('type.transfer'))}</option>
  `;
  typeSelect.addEventListener('change', () => {
    state.type = typeSelect.value as ViewState['type'];
    void onChange();
  });

  form.append(search, from, to, accountSelect, typeSelect);
  form.addEventListener('submit', (e) => e.preventDefault());
  return form;
}

function renderTransactionRow(
  tx: TransactionRow,
  accounts: AccountRow[],
  categories: CategoryRow[],
  onChange: () => void,
): HTMLLIElement {
  const account = accounts.find((a) => a.id === tx.accountId);
  const category = categories.find((c) => c.id === tx.categoryId);
  const money = new Money(tx.amount, tx.currency);
  const sign = tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '↔';

  const li = el('li', { class: `tx tx--${tx.type}`, dataset: { id: tx.id } });
  li.appendChild(
    el('span', { class: 'tx__icon', 'aria-hidden': 'true' }, [category?.icon ?? '📝']),
  );
  const info = el('div', { class: 'tx__info' });
  info.appendChild(el('span', { class: 'tx__desc' }, [tx.description]));
  const meta = el('span', { class: 'tx__meta' });
  meta.textContent = `${formatDate(parseDate(tx.date))} · ${account?.name ?? '?'}${category ? ' · ' + category.name : ''}`;
  info.appendChild(meta);
  li.appendChild(info);
  li.appendChild(
    el('span', { class: 'tx__amount' }, [`${sign} ${formatMoney(money)}`]),
  );

  const actions = el('div', { class: 'tx__actions' });
  const editBtn = el('button', { type: 'button', class: 'btn btn--icon', 'aria-label': t('action.edit') }, ['✏️']);
  editBtn.addEventListener('click', () => openEditDialog(tx, accounts, categories, onChange));
  const delBtn = el('button', { type: 'button', class: 'btn btn--icon btn--danger', 'aria-label': t('action.delete') }, ['🗑']);
  delBtn.addEventListener('click', async () => {
    const ok = await confirmDialog(t('confirm.delete'));
    if (!ok) return;
    const snapshot = { ...tx };
    await deleteTransaction(tx.id);
    broadcastChange();
    onChange();
    toast(t('toast.undo.delete'), {
      level: 'info',
      action: {
        label: t('action.undo'),
        onClick: async () => {
          await createTransaction({
            accountId: snapshot.accountId,
            description: snapshot.description,
            amount: snapshot.amount,
            type: snapshot.type,
            ...(snapshot.categoryId !== undefined ? { categoryId: snapshot.categoryId } : {}),
            date: snapshot.date,
            ...(snapshot.notes !== undefined ? { notes: snapshot.notes } : {}),
            tags: snapshot.tags,
          });
          broadcastChange();
          onChange();
        },
      },
    });
  });
  actions.append(editBtn, delBtn);
  li.appendChild(actions);
  return li;
}

function openAddDialog(accounts: AccountRow[], categories: CategoryRow[], onSaved: () => void): void {
  const form = buildTransactionForm({ accounts, categories, onSubmit: async (input) => {
      await createTransaction(input);
      broadcastChange();
      onSaved();
      toast('Movimiento agregado.', { level: 'success' });
    } });
  const { close } = openModal({ title: t('action.add') + ' movimiento', content: form.element });
  form.onCancel = close;
  form.onDone = close;
}

function openEditDialog(
  tx: TransactionRow,
  accounts: AccountRow[],
  categories: CategoryRow[],
  onSaved: () => void,
): void {
  const form = buildTransactionForm({
    accounts,
    categories,
    initial: tx,
    onSubmit: async (input) => {
      await updateTransaction(tx.id, input);
      broadcastChange();
      onSaved();
      toast('Movimiento actualizado.', { level: 'success' });
    },
  });
  const { close } = openModal({ title: t('action.edit') + ' movimiento', content: form.element });
  form.onCancel = close;
  form.onDone = close;
}
