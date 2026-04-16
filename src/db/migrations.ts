import { db, type TransactionRow, type CategoryRow, type AccountRow } from './schema.ts';
import { newId } from '@domain/id.ts';
import { DEFAULT_CATEGORIES } from '@features/categories/defaults.ts';

const LEGACY_KEY = 'transactions';
const MIGRATION_FLAG = 'legacy-v1-migrated';

interface LegacyTx {
  description: string;
  amount: number;
  type: 'ingreso' | 'gasto';
  category: string;
  date: string;
}

/**
 * One-time migration from the v1 localStorage schema.
 * Safe to call on every boot — checks a flag.
 */
export async function migrateLegacyLocalStorage(): Promise<{ migrated: number } | null> {
  const flag = await db.settings.get(MIGRATION_FLAG);
  if (flag) return null;

  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    await markMigrated(0);
    return null;
  }

  let parsed: LegacyTx[];
  try {
    const json = JSON.parse(raw) as unknown;
    if (!Array.isArray(json)) {
      await markMigrated(0);
      return null;
    }
    parsed = json as LegacyTx[];
  } catch {
    console.warn('Legacy transactions could not be parsed; skipping migration.');
    await markMigrated(0);
    return null;
  }

  // Backup the raw legacy data before we touch anything.
  localStorage.setItem(`${LEGACY_KEY}.backup.${Date.now()}`, raw);

  const now = new Date().toISOString();
  const defaultAccount: AccountRow = {
    id: newId('acc'),
    name: 'Cuenta principal',
    type: 'cash',
    currency: 'ARS',
    initialBalance: '0',
    icon: '💵',
    archived: false,
    order: 0,
    createdAt: now,
    updatedAt: now,
  };

  const categories: CategoryRow[] = DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: now }));
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const catByLegacyKey = new Map<string, string>([
    ['general', catByName.get('general') ?? categories[0].id],
    ['comida', catByName.get('comida') ?? categories[0].id],
    ['transporte', catByName.get('transporte') ?? categories[0].id],
    ['servicios', catByName.get('servicios') ?? categories[0].id],
    ['educacion', catByName.get('educación') ?? categories[0].id],
    ['salud', catByName.get('salud') ?? categories[0].id],
    ['otros', catByName.get('otros') ?? categories[0].id],
  ]);

  const txs: TransactionRow[] = parsed
    .filter(
      (t): t is LegacyTx =>
        !!t &&
        typeof t === 'object' &&
        typeof t.description === 'string' &&
        typeof t.date === 'string' &&
        Number.isFinite(t.amount),
    )
    .map((t): TransactionRow => {
      const categoryId = catByLegacyKey.get(t.category) ?? catByName.get('general');
      return {
        id: newId('tx'),
        accountId: defaultAccount.id,
        description: t.description,
        amount: String(Math.abs(t.amount)),
        currency: 'ARS',
        type: t.type === 'ingreso' ? 'income' : 'expense',
        ...(categoryId !== undefined ? { categoryId } : {}),
        date: t.date,
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
    });

  await db.transaction(
    'rw',
    db.accounts,
    db.categories,
    db.transactions,
    db.settings,
    async () => {
      const existingAccounts = await db.accounts.count();
      if (existingAccounts === 0) {
        await db.accounts.put(defaultAccount);
      }
      const existingCategories = await db.categories.count();
      if (existingCategories === 0) {
        await db.categories.bulkPut(categories);
      }
      if (txs.length > 0) {
        await db.transactions.bulkPut(txs);
      }
      await db.settings.put({
        key: MIGRATION_FLAG,
        value: { at: now, count: txs.length },
        updatedAt: now,
      });
    },
  );

  return { migrated: txs.length };
}

async function markMigrated(count: number): Promise<void> {
  await db.settings.put({
    key: MIGRATION_FLAG,
    value: { at: new Date().toISOString(), count },
    updatedAt: new Date().toISOString(),
  });
}
