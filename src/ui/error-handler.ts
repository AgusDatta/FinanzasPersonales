import { toast } from './toast.ts';
import { t } from './i18n.ts';
import { logger } from '@utils/logger.ts';

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => {
    logger.error('uncaught', e.error ?? e.message);
    toast(friendlyMessage(e.error ?? new Error(e.message)), { level: 'error' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    logger.error('unhandled rejection', e.reason);
    toast(friendlyMessage(e.reason), { level: 'error' });
  });
}

export function friendlyMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'QuotaExceededError' || /quota/i.test(err.message)) {
      return t('error.quota');
    }
    if (err.message && err.message.length < 200) return err.message;
  }
  return t('error.generic');
}
