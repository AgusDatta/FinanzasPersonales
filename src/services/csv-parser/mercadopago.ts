import type { BankParser } from './index.ts';
import { genericParser } from './generic.ts';

export const mercadopagoParser: BankParser = {
  id: 'mercadopago',
  name: 'Mercado Pago',
  detect(headers) {
    const joined = headers.join('|').toLowerCase();
    return (
      joined.includes('mercado pago') ||
      joined.includes('mercadopago') ||
      (joined.includes('source_id') && joined.includes('external_reference'))
    );
  },
  parse(raw, fallbackCurrency) {
    return { ...genericParser.parse(raw, fallbackCurrency), detectedBank: 'mercadopago' };
  },
};
