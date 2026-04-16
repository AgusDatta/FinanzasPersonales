import { describe, it, expect } from 'vitest';
import { convert, formatMoney, isCurrencyCode, CURRENCIES } from '@domain/currency.ts';
import { Money } from '@domain/money.ts';

describe('currency', () => {
  it('recognizes known codes', () => {
    expect(isCurrencyCode('ARS')).toBe(true);
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('XXX')).toBe(false);
    expect(isCurrencyCode(123)).toBe(false);
  });

  it('formats money in AR locale', () => {
    const m = new Money('1234.5', 'ARS');
    const out = formatMoney(m, 'es-AR');
    expect(out).toContain('1');
    expect(out.replace(/\s/g, '')).toMatch(/\$1[.,]234[,.]50/);
  });

  it('converts using a rate', () => {
    const usd = new Money('10', 'USD');
    const ars = convert(usd, {
      from: 'USD',
      to: 'ARS',
      rate: '1000',
      quotedAt: new Date().toISOString(),
      source: 'manual',
    });
    expect(ars.currency).toBe('ARS');
    expect(ars.toString()).toBe('10000');
  });

  it('knows minor units per currency', () => {
    expect(CURRENCIES.ARS.minorUnits).toBe(2);
    expect(CURRENCIES.CLP.minorUnits).toBe(0);
  });
});
