export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';
const mql = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getStoredTheme(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export function applyTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  const effective = theme === 'system' ? (mql?.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = effective;
}

export function initTheme(): void {
  applyTheme(getStoredTheme());
  mql?.addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  });
}
