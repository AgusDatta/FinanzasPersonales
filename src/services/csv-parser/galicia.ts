import type { BankParser } from './index.ts';
import { genericParser } from './generic.ts';

export const galiciaParser: BankParser = {
  id: 'galicia',
  name: 'Banco Galicia',
  detect(headers) {
    const joined = headers.join('|').toLowerCase();
    return joined.includes('galicia') || (joined.includes('fecha') && joined.includes('concepto') && joined.includes('debitos'));
  },
  parse(raw, fallbackCurrency) {
    const result = genericParser.parse(raw, fallbackCurrency);
    return { ...result, detectedBank: 'galicia' };
  },
};
