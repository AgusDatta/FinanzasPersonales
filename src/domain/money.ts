import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

export type CurrencyCode = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'CLP' | 'UYU';

export interface MoneyJSON {
  amount: string;
  currency: CurrencyCode;
}

/**
 * Money value object. Immutable. Uses decimal.js internally — never floats.
 * All persistence stores `amount` as a string to avoid FP drift.
 */
export class Money {
  readonly value: Decimal;
  readonly currency: CurrencyCode;

  constructor(amount: Decimal.Value, currency: CurrencyCode) {
    this.value = new Decimal(amount);
    this.currency = currency;
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0, currency);
  }

  static fromJSON(json: MoneyJSON): Money {
    return new Money(json.amount, json.currency);
  }

  /**
   * Parse a user-typed string, accepting both `1.234,56` (AR) and `1,234.56` (US).
   * Rejects NaN, empty, and non-finite values.
   */
  static parse(input: string, currency: CurrencyCode): Money {
    if (typeof input !== 'string') throw new MoneyParseError('Input must be a string');
    const trimmed = input.trim();
    if (!trimmed) throw new MoneyParseError('Empty amount');

    const hasComma = trimmed.includes(',');
    const hasDot = trimmed.includes('.');
    let normalized: string;
    if (hasComma && hasDot) {
      // Assume the last separator is the decimal one.
      const lastComma = trimmed.lastIndexOf(',');
      const lastDot = trimmed.lastIndexOf('.');
      if (lastComma > lastDot) {
        normalized = trimmed.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = trimmed.replace(/,/g, '');
      }
    } else if (hasComma) {
      normalized = trimmed.replace(',', '.');
    } else {
      normalized = trimmed;
    }

    try {
      const d = new Decimal(normalized);
      if (!d.isFinite()) throw new MoneyParseError(`Non-finite amount: ${input}`);
      return new Money(d, currency);
    } catch (err) {
      if (err instanceof MoneyParseError) throw err;
      throw new MoneyParseError(`Invalid amount "${input}"`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.plus(other.value), this.currency);
  }

  sub(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.minus(other.value), this.currency);
  }

  mul(factor: Decimal.Value): Money {
    return new Money(this.value.times(factor), this.currency);
  }

  div(divisor: Decimal.Value): Money {
    const d = new Decimal(divisor);
    if (d.isZero()) throw new Error('Division by zero');
    return new Money(this.value.dividedBy(d), this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  abs(): Money {
    return new Money(this.value.abs(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    return this.value.comparedTo(other.value) as -1 | 0 | 1;
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  toString(): string {
    return this.value.toFixed();
  }

  toJSON(): MoneyJSON {
    return { amount: this.value.toFixed(), currency: this.currency };
  }

  /** Round to the currency's minor unit (2 decimals for most, 0 for CLP). */
  roundToMinor(): Money {
    const minorDigits = this.currency === 'CLP' ? 0 : 2;
    return new Money(this.value.toDecimalPlaces(minorDigits, Decimal.ROUND_HALF_EVEN), this.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}

export class MoneyParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyParseError';
  }
}

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

export function sumMoney(amounts: Money[], currency: CurrencyCode): Money {
  return amounts.reduce((acc, m) => acc.add(m), Money.zero(currency));
}
