/**
 * Generate a short, time-ordered, URL-safe ID.
 * Not cryptographically secure — fine for client-side records.
 */
export function newId(prefix = ''): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${ts}${rnd}` : `${ts}${rnd}`;
}
