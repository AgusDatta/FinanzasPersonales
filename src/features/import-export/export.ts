import type { TransactionRow, AccountRow, CategoryRow } from '@db/schema.ts';

const SCHEMA_VERSION = 2;

export interface ExportBundle {
  schemaVersion: number;
  exportedAt: string;
  app: 'finanzas-personales';
  data: {
    accounts: AccountRow[];
    categories: CategoryRow[];
    transactions: TransactionRow[];
  };
  checksum: string;
}

export function buildBundle(
  accounts: AccountRow[],
  categories: CategoryRow[],
  transactions: TransactionRow[],
): ExportBundle {
  const payload = { accounts, categories, transactions };
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'finanzas-personales',
    data: payload,
    checksum: computeChecksum(payload),
  };
}

export function exportAsJSON(
  accounts: AccountRow[],
  categories: CategoryRow[],
  transactions: TransactionRow[],
): Blob {
  const bundle = buildBundle(accounts, categories, transactions);
  return new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
}

export function exportAsCSV(transactions: TransactionRow[]): Blob {
  const header = ['Fecha', 'Descripción', 'Monto', 'Moneda', 'Tipo', 'Categoría', 'Cuenta', 'Notas'];
  const rows = [header.join(',')];
  for (const t of transactions) {
    rows.push(
      [
        t.date,
        csvField(t.description),
        t.amount,
        t.currency,
        t.type,
        csvField(t.categoryId ?? ''),
        t.accountId,
        csvField(t.notes ?? ''),
      ].join(','),
    );
  }
  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
}

function csvField(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function computeChecksum(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export function validateBundle(bundle: unknown): bundle is ExportBundle {
  if (!bundle || typeof bundle !== 'object') return false;
  const b = bundle as Partial<ExportBundle>;
  if (b.app !== 'finanzas-personales') return false;
  if (typeof b.schemaVersion !== 'number') return false;
  if (!b.data || typeof b.data !== 'object') return false;
  const d = b.data;
  return Array.isArray(d.accounts) && Array.isArray(d.categories) && Array.isArray(d.transactions);
}
