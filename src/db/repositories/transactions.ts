import Dexie from 'dexie';
import { db, type TransactionRow } from '../schema.ts';
import { newId } from '@domain/id.ts';
import { transactionSchema, type TransactionInput } from '@domain/validation.ts';
import { getAccount } from './accounts.ts';

export interface TransactionFilter {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionRow['type'];
  search?: string;
}

export async function listTransactions(filter: TransactionFilter = {}): Promise<TransactionRow[]> {
  const collection = db.transactions.orderBy('date').reverse();
  let rows = await collection.toArray();
  if (filter.from) rows = rows.filter((t) => t.date >= filter.from!);
  if (filter.to) rows = rows.filter((t) => t.date <= filter.to!);
  if (filter.accountId) rows = rows.filter((t) => t.accountId === filter.accountId);
  if (filter.categoryId) rows = rows.filter((t) => t.categoryId === filter.categoryId);
  if (filter.type) rows = rows.filter((t) => t.type === filter.type);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    rows = rows.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }
  return rows;
}

export async function getTransaction(id: string): Promise<TransactionRow | undefined> {
  return db.transactions.get(id);
}

export async function createTransaction(input: TransactionInput): Promise<TransactionRow> {
  const parsed = transactionSchema.parse(input);
  const account = await getAccount(parsed.accountId);
  if (!account) throw new Error(`Cuenta no existe: ${parsed.accountId}`);

  const now = new Date().toISOString();
  const row: TransactionRow = {
    id: parsed.id ?? newId('tx'),
    accountId: parsed.accountId,
    description: parsed.description,
    amount: parsed.amount,
    currency: account.currency,
    type: parsed.type,
    ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId } : {}),
    date: parsed.date,
    ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
    tags: parsed.tags,
    ...(parsed.pairId !== undefined ? { pairId: parsed.pairId } : {}),
    ...(parsed.fxSnapshot !== undefined ? { fxSnapshot: parsed.fxSnapshot } : {}),
    ...(parsed.recurringId !== undefined ? { recurringId: parsed.recurringId } : {}),
    dedupHash: makeDedupHash(parsed.date, parsed.amount, parsed.description),
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.put(row);
  return row;
}

export async function updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<void> {
  const existing = await db.transactions.get(id);
  if (!existing) throw new Error(`Movimiento no existe: ${id}`);
  const merged: TransactionInput = {
    ...existing,
    ...patch,
    amount: patch.amount ?? existing.amount,
    tags: patch.tags ?? existing.tags,
  };
  const parsed = transactionSchema.parse(merged);
  await db.transactions.update(id, {
    ...parsed,
    updatedAt: new Date().toISOString(),
    dedupHash: makeDedupHash(parsed.date, parsed.amount, parsed.description),
  } as Partial<TransactionRow>);
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    const tx = await db.transactions.get(id);
    if (!tx) return;
    if (tx.pairId) {
      await db.transactions.delete(tx.pairId);
    }
    await db.transactions.delete(id);
  });
}

/** Create a transfer between two accounts — two linked transactions atomically. */
export async function createTransfer(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  /** For cross-currency transfers, the amount that lands in the destination account */
  amountTo?: string;
  date: string;
  description: string;
  notes?: string;
}): Promise<{ out: TransactionRow; in: TransactionRow }> {
  const from = await getAccount(params.fromAccountId);
  const to = await getAccount(params.toAccountId);
  if (!from || !to) throw new Error('Cuenta origen o destino inválida');
  if (from.id === to.id) throw new Error('No podés transferir a la misma cuenta');

  const now = new Date().toISOString();
  const outId = newId('tx');
  const inId = newId('tx');
  const outRow: TransactionRow = {
    id: outId,
    accountId: from.id,
    description: params.description,
    amount: params.amount,
    currency: from.currency,
    type: 'transfer',
    date: params.date,
    ...(params.notes !== undefined ? { notes: params.notes } : {}),
    tags: [],
    pairId: inId,
    createdAt: now,
    updatedAt: now,
  };
  const inRow: TransactionRow = {
    id: inId,
    accountId: to.id,
    description: params.description,
    amount: params.amountTo ?? params.amount,
    currency: to.currency,
    type: 'transfer',
    date: params.date,
    ...(params.notes !== undefined ? { notes: params.notes } : {}),
    tags: [],
    pairId: outId,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.transactions, async () => {
    await db.transactions.bulkPut([outRow, inRow]);
  });
  return { out: outRow, in: inRow };
}

export async function bulkImport(
  rows: TransactionRow[],
  options: { deduplicate: boolean } = { deduplicate: true },
): Promise<{ inserted: number; duplicates: number }> {
  if (!options.deduplicate) {
    await db.transactions.bulkPut(rows);
    return { inserted: rows.length, duplicates: 0 };
  }
  const hashes = rows.map((r) => r.dedupHash).filter((h): h is string => !!h);
  const existing = await db.transactions.where('dedupHash').anyOf(hashes).toArray();
  const seenHashes = new Set<string>(existing.map((t) => t.dedupHash).filter((h): h is string => !!h));
  const fresh: TransactionRow[] = [];
  for (const r of rows) {
    if (!r.dedupHash) {
      fresh.push(r);
      continue;
    }
    if (seenHashes.has(r.dedupHash)) continue;
    seenHashes.add(r.dedupHash);
    fresh.push(r);
  }
  await db.transactions.bulkPut(fresh);
  return { inserted: fresh.length, duplicates: rows.length - fresh.length };
}

export function makeDedupHash(date: string, amount: string, description: string): string {
  const normalized = `${date}|${amount}|${description.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  // Not cryptographic — good enough for import dedup.
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return hash.toString(36) + ':' + normalized.length.toString(36);
}

/** Watch: emits whenever transactions change. Returns an unsubscribe fn. */
export function watchTransactions(cb: () => void): () => void {
  const handler = () => cb();
  const hooks: Array<() => void> = [];
  const attach = (
    event: 'creating' | 'updating' | 'deleting',
  ) => {
    const hookFn = (_primKey: unknown, _obj: unknown) => {
      queueMicrotask(handler);
    };
    db.transactions.hook(event as 'creating', hookFn as never);
    hooks.push(() => db.transactions.hook(event as 'creating').unsubscribe(hookFn as never));
  };
  attach('creating');
  attach('updating');
  attach('deleting');
  return () => hooks.forEach((h) => h());
}

/** Best-effort storage quota check. */
export async function checkStorageQuota(): Promise<{ usage: number; quota: number; ratio: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  const usage = est.usage ?? 0;
  const quota = est.quota ?? 0;
  return { usage, quota, ratio: quota === 0 ? 0 : usage / quota };
}

// Re-export Dexie's error for consumers who need to detect QuotaExceededError.
export { Dexie };
