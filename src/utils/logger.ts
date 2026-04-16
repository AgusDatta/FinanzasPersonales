/**
 * Lightweight logger. Swappable with a real observability client later.
 * Never includes PII; amounts/names should be abstracted before logging.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.debug('[fp]', ...args);
  },
  info: (...args: unknown[]) => console.info('[fp]', ...args),
  warn: (...args: unknown[]) => console.warn('[fp]', ...args),
  error: (...args: unknown[]) => console.error('[fp]', ...args),
};
