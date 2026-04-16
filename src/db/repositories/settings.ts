import { db } from '../schema.ts';

export async function getSetting<T = unknown>(key: string, fallback?: T): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return (row?.value as T | undefined) ?? fallback;
}

export async function setSetting<T = unknown>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value, updatedAt: new Date().toISOString() });
}

export interface UserSettings {
  displayCurrency: 'ARS' | 'USD' | 'EUR';
  locale: 'es-AR' | 'en';
  theme: 'light' | 'dark' | 'system';
  budgetAlerts: boolean;
  notifications: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  displayCurrency: 'ARS',
  locale: 'es-AR',
  theme: 'system',
  budgetAlerts: true,
  notifications: false,
};

export async function getUserSettings(): Promise<UserSettings> {
  const stored = (await getSetting<Partial<UserSettings>>('user-settings')) ?? {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getUserSettings();
  const next = { ...current, ...patch };
  await setSetting('user-settings', next);
  return next;
}
