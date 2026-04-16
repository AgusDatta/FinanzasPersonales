import { db } from '@db/schema.ts';
import { validateBundle } from './export.ts';

export interface ImportResult {
  accounts: number;
  categories: number;
  transactions: number;
}

export async function importBundle(
  bundle: unknown,
  mode: 'replace' | 'merge' = 'merge',
): Promise<ImportResult> {
  if (!validateBundle(bundle)) {
    throw new Error('Archivo inválido: no es un backup de Finanzas Personales.');
  }
  const b = bundle;

  return db.transaction('rw', db.accounts, db.categories, db.transactions, async () => {
    if (mode === 'replace') {
      await db.accounts.clear();
      await db.categories.clear();
      await db.transactions.clear();
    }
    await db.accounts.bulkPut(b.data.accounts);
    await db.categories.bulkPut(b.data.categories);
    await db.transactions.bulkPut(b.data.transactions);
    return {
      accounts: b.data.accounts.length,
      categories: b.data.categories.length,
      transactions: b.data.transactions.length,
    };
  });
}
