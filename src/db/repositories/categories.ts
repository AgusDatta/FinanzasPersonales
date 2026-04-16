import { db, type CategoryRow } from '../schema.ts';
import { newId } from '@domain/id.ts';
import { categorySchema, type CategoryInput } from '@domain/validation.ts';

export async function listCategories(): Promise<CategoryRow[]> {
  return db.categories.orderBy('name').toArray();
}

export async function createCategory(input: CategoryInput): Promise<CategoryRow> {
  const parsed = categorySchema.parse(input);
  const row: CategoryRow = {
    id: parsed.id ?? newId('cat'),
    name: parsed.name,
    ...(parsed.parentId !== undefined ? { parentId: parsed.parentId } : {}),
    icon: parsed.icon,
    color: parsed.color,
    type: parsed.type,
    createdAt: new Date().toISOString(),
  };
  await db.categories.put(row);
  return row;
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void> {
  await db.categories.update(id, patch as Partial<CategoryRow>);
}

export async function deleteCategory(id: string): Promise<void> {
  await db.transaction('rw', db.categories, db.transactions, async () => {
    const count = await db.transactions.where('categoryId').equals(id).count();
    if (count > 0) {
      await db.transactions.where('categoryId').equals(id).modify((tx) => {
        delete tx.categoryId;
      });
    }
    await db.categories.delete(id);
  });
}
