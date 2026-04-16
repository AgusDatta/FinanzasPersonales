import type { BankParser, ParsedCSV } from './index.ts';
import { splitCSV } from './index.ts';
import { Money } from '@domain/money.ts';
import { parseDate, toISODate } from '@domain/date.ts';
import { newId } from '@domain/id.ts';
import { makeDedupHash } from '@db/repositories/transactions.ts';

const DATE_COLS = ['fecha', 'date', 'fec'];
const DESC_COLS = ['descripcion', 'descripción', 'description', 'detalle', 'concepto', 'merchant'];
const AMOUNT_COLS = ['monto', 'importe', 'amount', 'valor', 'total'];
const CREDIT_COLS = ['credito', 'crédito', 'haber', 'credit', 'ingreso'];
const DEBIT_COLS = ['debito', 'débito', 'debe', 'debit', 'egreso', 'gasto'];

function findCol(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const cand of candidates) {
    const idx = normalized.findIndex((h) => h === cand || h.includes(cand));
    if (idx >= 0) return idx;
  }
  return -1;
}

export const genericParser: BankParser = {
  id: 'generic',
  name: 'CSV genérico',
  detect: () => false, // fallback only
  parse(raw: string, fallbackCurrency): ParsedCSV {
    const { headers, rows } = splitCSV(raw);
    const warnings: string[] = [];
    const dateCol = findCol(headers, DATE_COLS);
    const descCol = findCol(headers, DESC_COLS);
    const amountCol = findCol(headers, AMOUNT_COLS);
    const creditCol = findCol(headers, CREDIT_COLS);
    const debitCol = findCol(headers, DEBIT_COLS);

    if (dateCol < 0 || descCol < 0 || (amountCol < 0 && creditCol < 0 && debitCol < 0)) {
      warnings.push(
        'No se detectaron las columnas fecha/descripción/monto. Mapeá manualmente o revisá el CSV.',
      );
      return { rows: [], detectedBank: 'generic', warnings };
    }

    const out: ParsedCSV['rows'] = [];
    for (const [idx, row] of rows.entries()) {
      try {
        const dateStr = row[dateCol];
        const desc = row[descCol] ?? '';
        let amountStr = '0';
        let type: 'income' | 'expense' = 'expense';
        if (amountCol >= 0) {
          const raw = row[amountCol] ?? '';
          const money = Money.parse(raw.replace('-', ''), fallbackCurrency);
          amountStr = money.value.toFixed();
          type = raw.trim().startsWith('-') ? 'expense' : 'income';
        } else {
          const credit = creditCol >= 0 ? (row[creditCol] ?? '') : '';
          const debit = debitCol >= 0 ? (row[debitCol] ?? '') : '';
          if (credit && !/^0+[,.]?0*$/.test(credit)) {
            amountStr = Money.parse(credit, fallbackCurrency).value.toFixed();
            type = 'income';
          } else if (debit && !/^0+[,.]?0*$/.test(debit)) {
            amountStr = Money.parse(debit, fallbackCurrency).value.toFixed();
            type = 'expense';
          } else {
            continue;
          }
        }

        const date = toISODate(parseDate(normalizeDate(dateStr)));
        out.push({
          id: newId('tx'),
          description: desc,
          amount: amountStr,
          currency: fallbackCurrency,
          type,
          date,
          tags: ['import'],
          dedupHash: makeDedupHash(date, amountStr, desc),
        });
      } catch (err) {
        warnings.push(`Fila ${idx + 2} no se pudo parsear: ${(err as Error).message}`);
      }
    }
    return { rows: out, detectedBank: 'generic', warnings };
  },
};

function normalizeDate(s: string): string {
  const trimmed = s.trim();
  // DD/MM/YYYY -> YYYY-MM-DD
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (match) {
    const [, d, m, y] = match;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
}
