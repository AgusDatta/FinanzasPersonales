import { db } from '@db/schema.ts';
import { migrateLegacyLocalStorage } from '@db/migrations.ts';
import { runDueRecurrences } from '@db/repositories/recurring.ts';
import { listCategories, createCategory } from '@db/repositories/categories.ts';
import { DEFAULT_CATEGORIES } from '@features/categories/defaults.ts';
import { getUserSettings } from '@db/repositories/settings.ts';
import { initTheme, applyTheme } from '@ui/theme.ts';
import { setLocale, t } from '@ui/i18n.ts';
import { toast } from '@ui/toast.ts';
import { installGlobalErrorHandlers } from '@ui/error-handler.ts';
import { initBroadcast } from '@ui/broadcast.ts';
import { currentRoute, init as initRouter, navigate, onRouteChange } from '@ui/router.ts';
import { init as initShortcuts, register } from '@ui/shortcuts.ts';
import { el } from '@utils/dom.ts';
import { logger } from '@utils/logger.ts';
import { renderDashboard } from '@features/dashboard/view.ts';
import { renderTransactions } from '@features/transactions/view.ts';
import { renderAccounts } from '@features/accounts/view.ts';
import { renderBudgets } from '@features/budgets/view.ts';
import { renderRecurring } from '@features/recurring/view.ts';
import { renderReports } from '@features/reports/view.ts';
import { renderSettings } from '@features/settings/view.ts';

export async function bootstrap(): Promise<void> {
  installGlobalErrorHandlers();
  initTheme();

  try {
    await db.open();
  } catch (err) {
    logger.error('Failed to open DB', err);
    renderRecoveryScreen();
    return;
  }

  try {
    await ensureBaseData();
    const migration = await migrateLegacyLocalStorage();
    if (migration && migration.migrated > 0) {
      toast(t('toast.migrated', { count: migration.migrated }), { level: 'success' });
    }
    const generated = await runDueRecurrences();
    if (generated > 0) {
      toast(`Se crearon ${generated} movimientos recurrentes.`, { level: 'info' });
    }
  } catch (err) {
    logger.error('Bootstrap data error', err);
  }

  const settings = await getUserSettings();
  setLocale(settings.locale);
  applyTheme(settings.theme);

  mountShell();
  initRouter();
  initShortcuts();
  initBroadcast(() => rerender());
  registerShortcuts();

  rerender();
  onRouteChange(() => rerender());

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register('/sw.js').catch((err) => logger.warn('SW register failed', err));
  }
}

async function ensureBaseData(): Promise<void> {
  const cats = await listCategories();
  if (cats.length === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await createCategory({
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type,
      });
    }
  }
}

function mountShell(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) throw new Error('#app root not found in DOM');
  appRoot.innerHTML = '';

  const skip = el('a', { href: '#main-content', class: 'skip-link' }, ['Saltar al contenido']);
  appRoot.appendChild(skip);

  const topbar = el('header', { class: 'topbar', role: 'banner' });
  const brand = el('div', { class: 'topbar__brand' });
  brand.appendChild(el('span', { class: 'topbar__logo', 'aria-hidden': 'true' }, ['💰']));
  brand.appendChild(el('span', { class: 'topbar__title' }, [t('app.title')]));
  topbar.appendChild(brand);
  appRoot.appendChild(topbar);

  const nav = el('nav', { class: 'sidebar', role: 'navigation', 'aria-label': 'Principal' });
  const routes: Array<[string, string, string]> = [
    ['dashboard', '📊', t('nav.dashboard')],
    ['transactions', '📋', t('nav.transactions')],
    ['accounts', '🏦', t('nav.accounts')],
    ['budgets', '🎯', t('nav.budgets')],
    ['recurring', '🔁', t('nav.recurring')],
    ['reports', '📈', t('nav.reports')],
    ['settings', '⚙️', t('nav.settings')],
  ];
  for (const [route, icon, label] of routes) {
    const btn = el('a', { href: `#${route}`, class: 'sidebar__link', 'data-route': route });
    btn.appendChild(el('span', { class: 'sidebar__icon', 'aria-hidden': 'true' }, [icon]));
    btn.appendChild(el('span', { class: 'sidebar__label' }, [label]));
    nav.appendChild(btn);
  }
  appRoot.appendChild(nav);

  const main = el('main', { id: 'main-content', class: 'main', tabindex: '-1' });
  appRoot.appendChild(main);
}

function registerShortcuts(): void {
  register('n', () => navigate('transactions'));
  register('g d', () => navigate('dashboard'));
  register('g t', () => navigate('transactions'));
  register('g a', () => navigate('accounts'));
  register('g b', () => navigate('budgets'));
  register('g r', () => navigate('reports'));
  register('g s', () => navigate('settings'));
  register('/', () => {
    const search = document.querySelector<HTMLInputElement>('input[type=search]');
    search?.focus();
  });
}

function rerender(): void {
  const route = currentRoute();
  const main = document.getElementById('main-content');
  if (!main) return;
  document.querySelectorAll('.sidebar__link').forEach((link) => {
    link.classList.toggle('sidebar__link--active', link.getAttribute('data-route') === route);
  });
  switch (route) {
    case 'dashboard':
      void renderDashboard(main);
      break;
    case 'transactions':
      void renderTransactions(main);
      break;
    case 'accounts':
      void renderAccounts(main);
      break;
    case 'budgets':
      void renderBudgets(main);
      break;
    case 'recurring':
      void renderRecurring(main);
      break;
    case 'reports':
      void renderReports(main);
      break;
    case 'settings':
      void renderSettings(main);
      break;
  }
}

function renderRecoveryScreen(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  appRoot.innerHTML = `
    <div class="recovery">
      <h1>No se pudo abrir la base de datos</h1>
      <p>Esto puede pasar si los datos están corruptos o el navegador bloqueó el acceso.</p>
      <button id="reset-db" class="btn btn--danger">Borrar todo y empezar de cero</button>
    </div>
  `;
  document.getElementById('reset-db')?.addEventListener('click', async () => {
    await db.delete();
    window.location.reload();
  });
}
