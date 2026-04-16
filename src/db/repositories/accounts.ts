import { db, type AccountRow } from '../schema.ts';
import { newId } from '@domain/id.ts';
import { accountSchema, type AccountInput } from '@domain/validation.ts';

export async function listAccounts(includeArchived = false): Promise<AccountRow[]> {
  const all = await db.accounts.orderBy('order').toArray();
  return includeArchived ? all : all.filter((a) => !a.archived);
}

export async function getAccount(id: string): Promise<AccountRow | undefined> {
  return db.accounts.get(id);
}

export async function createAccount(input: AccountInput): Promise<AccountRow> {
  const parsed = accountSchema.parse(input);
  const now = new Date().toISOString();
  const maxOrder = await db.accounts.orderBy('order').last();
  const row: AccountRow = {
    id: parsed.id ?? newId('acc'),
    name: parsed.name,
    type: parsed.type,
    currency: parsed.currency,
    initialBalance: parsed.initialBalance,
    icon: parsed.icon,
    archived: parsed.archived,
    ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
    order: (maxOrder?.order ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.accounts.put(row);
  return row;
}

export async function updateAccount(id: string, patch: Partial<AccountInput>): Promise<void> {
  await db.accounts.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  } as Partial<AccountRow>);
}

export async function archiveAccount(id: string, archived = true): Promise<void> {
  await db.accounts.update(id, { archived, updatedAt: new Date().toISOString() });
}

export async function deleteAccount(id: string): Promise<void> {
  await db.transaction('rw', db.accounts, db.transactions, async () => {
    const txCount = await db.transactions.where('accountId').equals(id).count();
    if (txCount > 0) {
      throw new Error(
        `No se puede eliminar: la cuenta tiene ${txCount} movimientos. Archivala en su lugar.`,
      );
    }
    await db.accounts.delete(id);
  });
}
