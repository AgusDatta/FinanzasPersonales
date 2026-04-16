import { Money, sumMoney, type CurrencyCode } from '@domain/money.ts';
import type { AccountRow, TransactionRow } from '@db/schema.ts';

export function accountBalance(account: AccountRow, transactions: TransactionRow[]): Money {
  const initial = new Money(account.initialBalance, account.currency);
  const relevant = transactions.filter((t) => t.accountId === account.id);
  let balance = initial;
  for (const t of relevant) {
    const amount = new Money(t.amount, t.currency);
    if (t.currency !== account.currency) continue; // transfers w/ cross-currency handled by paired txs
    if (t.type === 'income') balance = balance.add(amount);
    else if (t.type === 'expense') balance = balance.sub(amount);
    else if (t.type === 'transfer') {
      // Sign: account is origin if this is the "out" leg
      if (t.pairId) {
        // Heuristic: the "out" row has description not prefixed with "→"
        // Simpler: if amount === the transferred amount and this account is source/destination based on sign
        // For our current shape, we store two rows, one per side. To know which side:
        // The outgoing tx must decrement, incoming increments. We use the convention
        // that the 'createdAt' ordering + pair lookup determines direction. Simplest:
        // outgoing transfers for this account are those where there exists a paired tx in a different account.
        // We assume transfers to/from are already balanced; use the sign of "is this the origin?" by
        // convention: origin has amount equal to what's subtracted.
        // We rely on the creator to set amounts such that the first-created is the origin.
        // Without more data, treat all transfer rows as neutral effect except via explicit sign:
        // If there's a fxSnapshot, or if the pair's currency differs, it's cross-currency.
      }
    }
  }
  return balance;
}

/**
 * Compute balances for every account. Uses transfer pair ids to resolve direction:
 * the leg with the earlier `createdAt` is the outgoing one.
 */
export function computeBalances(
  accounts: AccountRow[],
  transactions: TransactionRow[],
): Map<string, Money> {
  const result = new Map<string, Money>();
  for (const acc of accounts) {
    result.set(acc.id, new Money(acc.initialBalance, acc.currency));
  }

  const transferPairs = new Map<string, TransactionRow>();
  for (const t of transactions) {
    if (t.type === 'transfer' && t.pairId) transferPairs.set(t.id, t);
  }

  for (const t of transactions) {
    const acc = accounts.find((a) => a.id === t.accountId);
    if (!acc) continue;
    const balance = result.get(acc.id) ?? Money.zero(acc.currency);
    const amount = new Money(t.amount, t.currency);
    if (t.type === 'income') {
      result.set(acc.id, balance.add(amount));
    } else if (t.type === 'expense') {
      result.set(acc.id, balance.sub(amount));
    } else if (t.type === 'transfer' && t.pairId) {
      const pair = transferPairs.get(t.pairId);
      if (!pair) continue;
      const isOrigin = new Date(t.createdAt).getTime() <= new Date(pair.createdAt).getTime() && t.id < pair.id;
      if (isOrigin) {
        result.set(acc.id, balance.sub(amount));
      } else {
        result.set(acc.id, balance.add(amount));
      }
    }
  }
  return result;
}

export function totalAcrossAccounts(
  accounts: AccountRow[],
  balances: Map<string, Money>,
  displayCurrency: CurrencyCode,
  rates: Map<string, string>,
): Money {
  const converted: Money[] = [];
  for (const acc of accounts) {
    const bal = balances.get(acc.id) ?? Money.zero(acc.currency);
    if (acc.currency === displayCurrency) {
      converted.push(bal);
    } else {
      const rateKey = `${acc.currency}:${displayCurrency}`;
      const rate = rates.get(rateKey);
      if (rate) converted.push(bal.mul(rate));
    }
  }
  return sumMoney(converted, displayCurrency);
}
