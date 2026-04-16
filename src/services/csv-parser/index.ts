import type { TransactionRow } from '@db/schema.ts';
import { galiciaParser } from './galicia.ts';
import { santanderParser } from './santander.ts';
import { bbvaParser } from './bbva.ts';
import { mercadopagoParser } from './mercadopago.ts';
import { genericParser } from './generic.ts';

export interface ParsedCSV {
  rows: Array<Omit<TransactionRow, 'createdAt' | 'updatedAt' | 'accountId'>>;
  detectedBank: string;
  warnings: string[];
}

export interface BankParser {
  id: string;
  name: string;
  /** Returns true if this parser recognizes the CSV. */
  detect(headers: string[], firstRow: string[]): boolean;
  parse(raw: string, fallbackCurrency: 'ARS' | 'USD'): ParsedCSV;
}

export const PARSERS: BankParser[] = [
  galiciaParser,
  santanderParser,
  bbvaParser,
  mercadopagoParser,
  genericParser, // fallback must be last
];

/**
 * Naive CSV parser — handles quoted fields and comma or semicolon delimiters.
 * Rejects CSVs with > 10,000 rows as a sanity check.
 */
export function splitCSV(raw: string): { headers: string[]; rows: string[][] } {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  if (lines.length > 10_000) throw new Error('CSV demasiado grande (> 10.000 filas)');

  const delimiter = detectDelimiter(lines[0]);
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter((l) => l.trim().length > 0).map(parseLine);
  return { headers, rows };
}

function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  if (semis >= commas && semis >= tabs) return ';';
  if (tabs > commas) return '\t';
  return ',';
}

export function autoDetectAndParse(raw: string, fallbackCurrency: 'ARS' | 'USD' = 'ARS'): ParsedCSV {
  const { headers, rows } = splitCSV(raw);
  if (headers.length === 0) {
    return { rows: [], detectedBank: 'none', warnings: ['CSV vacío'] };
  }
  const firstRow = rows[0] ?? [];
  for (const parser of PARSERS) {
    if (parser.detect(headers, firstRow)) {
      return parser.parse(raw, fallbackCurrency);
    }
  }
  return genericParser.parse(raw, fallbackCurrency);
}
