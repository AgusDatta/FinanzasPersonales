import Decimal from 'decimal.js';
import type { CurrencyCode } from './money.ts';
import { Money } from './money.ts';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  minorUnits: number;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  ARS: { code: 'ARS', symbol: '$', name: 'Peso argentino', minorUnits: 2, locale: 'es-AR' },
  USD: { code: 'USD', symbol: 'US$', name: 'Dólar estadounidense', minorUnits: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', minorUnits: 2, locale: 'es-ES' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real brasileño', minorUnits: 2, locale: 'pt-BR' },
  CLP: { code: 'CLP', symbol: '$', name: 'Peso chileno', minorUnits: 0, locale: 'es-CL' },
  UYU: { code: 'UYU', symbol: '$U', name: 'Peso uruguayo', minorUnits: 2, locale: 'es-UY' },
};

export function isCurrencyCode(x: unknown): x is CurrencyCode {
  return typeof x === 'string' && x in CURRENCIES;
}

/**
 * Format a Money using Intl.NumberFormat.
 * Respects the configured display locale (user setting), not the currency's native one.
 */
export function formatMoney(money: Money, displayLocale = 'es-AR'): string {
  const meta = CURRENCIES[money.currency];
  const formatter = new Intl.NumberFormat(displayLocale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: meta.minorUnits,
    maximumFractionDigits: meta.minorUnits,
  });
  return formatter.format(money.toNumber());
}

export function formatMoneyCompact(money: Money, displayLocale = 'es-AR'): string {
  const formatter = new Intl.NumberFormat(displayLocale, {
    style: 'currency',
    currency: money.currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return formatter.format(money.toNumber());
}

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  /** rate: 1 `from` = `rate` `to` */
  rate: string;
  /** ISO string of when the rate was quoted */
  quotedAt: string;
  source: 'dolarapi-blue' | 'dolarapi-mep' | 'dolarapi-oficial' | 'manual' | 'cache';
}

export function convert(money: Money, rate: ExchangeRate): Money {
  if (money.currency !== rate.from) {
    throw new Error(`Rate ${rate.from}->${rate.to} cannot convert ${money.currency}`);
  }
  const converted = money.value.times(new Decimal(rate.rate));
  return new Money(converted, rate.to);
}
