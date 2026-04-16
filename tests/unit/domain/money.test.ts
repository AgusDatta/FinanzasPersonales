import { describe, it, expect } from 'vitest';
import { Money, MoneyParseError, sumMoney, CurrencyMismatchError } from '@domain/money.ts';

describe('Money', () => {
  it('parses AR-format with comma decimal', () => {
    const m = Money.parse('1.234,56', 'ARS');
    expect(m.toString()).toBe('1234.56');
  });

  it('parses US-format with dot decimal', () => {
    const m = Money.parse('1,234.56', 'USD');
    expect(m.toString()).toBe('1234.56');
  });

  it('parses plain number', () => {
    expect(Money.parse('100', 'ARS').toString()).toBe('100');
    expect(Money.parse('100.5', 'USD').toString()).toBe('100.5');
  });

  it('rejects empty input', () => {
    expect(() => Money.parse('', 'ARS')).toThrow(MoneyParseError);
    expect(() => Money.parse('   ', 'ARS')).toThrow(MoneyParseError);
  });

  it('rejects non-numeric input', () => {
    expect(() => Money.parse('abc', 'ARS')).toThrow(MoneyParseError);
    expect(() => Money.parse('1.2.3.4', 'ARS')).toThrow();
  });

  it('adds amounts exactly without float drift', () => {
    const a = Money.parse('0.1', 'USD');
    const b = Money.parse('0.2', 'USD');
    expect(a.add(b).toString()).toBe('0.3');
  });

  it('adds many pennies exactly', () => {
    let total = Money.zero('USD');
    for (let i = 0; i < 100; i++) total = total.add(new Money('0.01', 'USD'));
    expect(total.toString()).toBe('1');
  });

  it('throws on cross-currency arithmetic', () => {
    const ars = new Money('100', 'ARS');
    const usd = new Money('10', 'USD');
    expect(() => ars.add(usd)).toThrow(CurrencyMismatchError);
    expect(() => ars.sub(usd)).toThrow(CurrencyMismatchError);
  });

  it('handles subtraction and negation', () => {
    const m = new Money('50', 'ARS');
    expect(m.sub(new Money('75', 'ARS')).toString()).toBe('-25');
    expect(m.negate().toString()).toBe('-50');
    expect(m.negate().abs().toString()).toBe('50');
  });

  it('rounds to minor units correctly', () => {
    expect(new Money('1.235', 'ARS').roundToMinor().toString()).toBe('1.24');
    expect(new Money('1.999', 'CLP').roundToMinor().toString()).toBe('2');
  });

  it('sumMoney aggregates correctly', () => {
    const amounts = [new Money('10', 'ARS'), new Money('20', 'ARS'), new Money('30', 'ARS')];
    expect(sumMoney(amounts, 'ARS').toString()).toBe('60');
  });

  it('rejects division by zero', () => {
    const m = new Money('10', 'USD');
    expect(() => m.div(0)).toThrow();
  });

  it('round-trips through JSON', () => {
    const m = new Money('1234.567', 'ARS');
    const json = m.toJSON();
    expect(Money.fromJSON(json).equals(m)).toBe(true);
  });

  it('is immutable', () => {
    const a = new Money('10', 'ARS');
    const b = a.add(new Money('5', 'ARS'));
    expect(a.toString()).toBe('10');
    expect(b.toString()).toBe('15');
  });
});
