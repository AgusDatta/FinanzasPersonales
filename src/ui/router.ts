type Route = 'dashboard' | 'transactions' | 'accounts' | 'budgets' | 'recurring' | 'reports' | 'settings';

const listeners = new Set<(route: Route) => void>();

export function currentRoute(): Route {
  const hash = window.location.hash.slice(1);
  if (
    hash === 'transactions' ||
    hash === 'accounts' ||
    hash === 'budgets' ||
    hash === 'recurring' ||
    hash === 'reports' ||
    hash === 'settings'
  ) {
    return hash;
  }
  return 'dashboard';
}

export function navigate(route: Route): void {
  window.location.hash = route;
}

export function onRouteChange(cb: (route: Route) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function init(): void {
  window.addEventListener('hashchange', () => {
    const r = currentRoute();
    listeners.forEach((fn) => fn(r));
  });
}
