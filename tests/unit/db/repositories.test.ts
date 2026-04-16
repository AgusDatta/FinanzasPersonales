import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { db, resetDatabase } from '@db/schema.ts';
import { createAccount, listAccounts, deleteAccount } from '@db/repositories/accounts.ts';
import {
  createTransaction,
  listTransactions,
  bulkImport,
  makeDedupHash,
} from '@db/repositories/transactions.ts';
import { createCategory, listCategories } from '@db/repositories/categories.ts';
import { toISODate } from '@domain/date.ts';

beforeEach(async () => {
  await resetDatabase();
});

afterEach(async () => {
  await db.close();
});

describe('accounts repository', () => {
  it('creates and lists accounts', async () => {
    await createAccount({
      name: 'Test',
      type: 'bank',
      currency: 'ARS',
      initialBalance: '0',
      icon: '🏦',
      archived: false,
    });
    const all = await listAccounts();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe('Test');
  });

  it('prevents deletion of account with transactions', async () => {
    const acc = await createAccount({
      name: 'Test',
      type: 'cash',
      currency: 'ARS',
      initialBalance: '0',
      icon: '💵',
      archived: false,
    });
    await createTransaction({
      accountId: acc.id,
      description: 'Test',
      amount: '100',
      type: 'expense',
      date: toISODate(new Date()),
      tags: [],
    });
    await expect(deleteAccount(acc.id)).rejects.toThrow(/movimientos/);
  });
});

describe('categories repository', () => {
  it('creates and lists categories', async () => {
    await createCategory({
      name: 'Comida',
      icon: '🍔',
      color: '#ff0000',
      type: 'expense',
    });
    const cats = await listCategories();
    expect(cats.length).toBe(1);
    expect(cats[0].type).toBe('expense');
  });
});

describe('transactions repository', () => {
  it('dedup hash is stable for same inputs', () => {
    const h1 = makeDedupHash('2025-01-15', '100.50', 'Café Starbucks');
    const h2 = makeDedupHash('2025-01-15', '100.50', 'Café Starbucks');
    const h3 = makeDedupHash('2025-01-15', '100.50', 'Café Starbucks diferente');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('bulkImport skips duplicates by hash', async () => {
    const acc = await createAccount({
      name: 'Test',
      type: 'bank',
      currency: 'ARS',
      initialBalance: '0',
      icon: '🏦',
      archived: false,
    });
    const now = new Date().toISOString();
    const base = {
      accountId: acc.id,
      currency: 'ARS' as const,
      type: 'expense' as const,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    const rows = [
      { ...base, id: 't1', description: 'Kiosko', amount: '50', date: '2025-01-10', dedupHash: makeDedupHash('2025-01-10', '50', 'Kiosko') },
      { ...base, id: 't2', description: 'Kiosko', amount: '50', date: '2025-01-10', dedupHash: makeDedupHash('2025-01-10', '50', 'Kiosko') },
      { ...base, id: 't3', description: 'Café', amount: '30', date: '2025-01-10', dedupHash: makeDedupHash('2025-01-10', '30', 'Café') },
    ];
    const result = await bulkImport(rows, { deduplicate: true });
    expect(result.inserted).toBe(2);
    expect(result.duplicates).toBe(1);
    const all = await listTransactions();
    expect(all.length).toBe(2);
  });

  it('filters by date range', async () => {
    const acc = await createAccount({
      name: 'Test',
      type: 'bank',
      currency: 'ARS',
      initialBalance: '0',
      icon: '🏦',
      archived: false,
    });
    await createTransaction({
      accountId: acc.id,
      description: 'Jan',
      amount: '100',
      type: 'expense',
      date: '2025-01-15',
      tags: [],
    });
    await createTransaction({
      accountId: acc.id,
      description: 'Feb',
      amount: '200',
      type: 'expense',
      date: '2025-02-15',
      tags: [],
    });
    const jan = await listTransactions({ from: '2025-01-01', to: '2025-01-31' });
    expect(jan.length).toBe(1);
    expect(jan[0].description).toBe('Jan');
  });
});
