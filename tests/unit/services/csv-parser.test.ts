import { describe, it, expect } from 'vitest';
import { autoDetectAndParse, splitCSV } from '@services/csv-parser/index.ts';

describe('CSV parser', () => {
  it('splits simple comma-separated CSVs', () => {
    const { headers, rows } = splitCSV('fecha,descripcion,monto\n2025-01-01,test,100');
    expect(headers).toEqual(['fecha', 'descripcion', 'monto']);
    expect(rows).toEqual([['2025-01-01', 'test', '100']]);
  });

  it('handles quoted fields with commas inside', () => {
    const { rows } = splitCSV('a,b\n"hello, world",42');
    expect(rows[0]).toEqual(['hello, world', '42']);
  });

  it('handles semicolon-delimited CSVs', () => {
    const { headers } = splitCSV('fecha;monto;descripcion\n2025-01-01;100;test');
    expect(headers).toEqual(['fecha', 'monto', 'descripcion']);
  });

  it('parses a generic CSV with DD/MM/YYYY dates', () => {
    const raw = 'fecha,descripcion,monto\n15/01/2025,Café,-100\n20/01/2025,Sueldo,5000';
    const result = autoDetectAndParse(raw, 'ARS');
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].date).toBe('2025-01-15');
    expect(result.rows[0].type).toBe('expense');
    expect(result.rows[1].type).toBe('income');
  });

  it('returns warnings when headers cannot be matched', () => {
    const result = autoDetectAndParse('foo,bar\n1,2', 'ARS');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
