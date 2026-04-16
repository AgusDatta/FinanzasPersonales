import type { BankParser } from './index.ts';
import { genericParser } from './generic.ts';

export const santanderParser: BankParser = {
  id: 'santander',
  name: 'Santander',
  detect(headers) {
    const joined = headers.join('|').toLowerCase();
    return joined.includes('santander') || (joined.includes('fecha') && joined.includes('importe') && joined.includes('descripcion'));
  },
  parse(raw, fallbackCurrency) {
    return { ...genericParser.parse(raw, fallbackCurrency), detectedBank: 'santander' };
  },
};
