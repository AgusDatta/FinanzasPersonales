import type { CurrencyCode } from '@domain/money.ts';
import type { ExchangeRate } from '@domain/currency.ts';
import { db } from '@db/schema.ts';

const DOLARAPI_URL = 'https://dolarapi.com/v1/dolares';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type DolarApiQuote = {
  casa: string; // "blue" | "oficial" | "mep" | "ccl" | "tarjeta"
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
};

export type RateSource = 'blue' | 'oficial' | 'mep' | 'ccl' | 'tarjeta';

export async function fetchARSRates(): Promise<DolarApiQuote[]> {
  const res = await fetch(DOLARAPI_URL);
  if (!res.ok) throw new Error(`dolarapi failed: ${res.status}`);
  return (await res.json()) as DolarApiQuote[];
}

/**
 * Get a USD->ARS exchange rate, with cache + network fallback.
 * Pass `source: 'blue'` to get the unofficial rate that Argentinians actually use.
 */
export async function getUsdToArsRate(source: RateSource = 'blue'): Promise<ExchangeRate> {
  const cacheId = `USD:ARS:dolarapi-${source}`;
  const cached = await db.exchangeRates.get(cacheId);
  const now = Date.now();
  if (cached && now - new Date(cached.cachedAt).getTime() < CACHE_TTL_MS) {
    return {
      from: 'USD',
      to: 'ARS',
      rate: cached.rate,
      quotedAt: cached.quotedAt,
      source: (cached.source as ExchangeRate['source']) ?? 'cache',
    };
  }

  try {
    const quotes = await fetchARSRates();
    const quote = quotes.find((q) => q.casa === source);
    if (!quote) throw new Error(`No quote for ${source}`);
    const rate = String(quote.venta);
    const quotedAt = quote.fechaActualizacion;
    await db.exchangeRates.put({
      id: cacheId,
      from: 'USD',
      to: 'ARS',
      rate,
      quotedAt,
      source: `dolarapi-${source}`,
      cachedAt: new Date().toISOString(),
    });
    return {
      from: 'USD',
      to: 'ARS',
      rate,
      quotedAt,
      source: `dolarapi-${source}` as ExchangeRate['source'],
    };
  } catch (err) {
    if (cached) {
      console.warn('Exchange rate fetch failed, using stale cache:', err);
      return {
        from: 'USD',
        to: 'ARS',
        rate: cached.rate,
        quotedAt: cached.quotedAt,
        source: 'cache',
      };
    }
    throw err;
  }
}

export async function setManualRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rate: string,
): Promise<ExchangeRate> {
  const now = new Date().toISOString();
  const id = `${from}:${to}:manual`;
  await db.exchangeRates.put({
    id,
    from,
    to,
    rate,
    quotedAt: now,
    source: 'manual',
    cachedAt: now,
  });
  return { from, to, rate, quotedAt: now, source: 'manual' };
}
