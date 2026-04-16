import type { BankParser } from './index.ts';
import { genericParser } from './generic.ts';

export const bbvaParser: BankParser = {
  id: 'bbva',
  name: 'BBVA',
  detect(headers) {
    const joined = headers.join('|').toLowerCase();
    return joined.includes('bbva') || (joined.includes('fecha') && joined.includes('movimiento'));
  },
  parse(raw, fallbackCurrency) {
    return { ...genericParser.parse(raw, fallbackCurrency), detectedBank: 'bbva' };
  },
};
