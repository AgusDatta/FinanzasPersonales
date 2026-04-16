import { el } from '@utils/dom.ts';

export type ToastLevel = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  level?: ToastLevel;
  duration?: number; // ms, 0 = sticky
  action?: { label: string; onClick: () => void };
}

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (container) return container;
  container = el('div', { class: 'toast-container', role: 'region', 'aria-live': 'polite' });
  document.body.appendChild(container);
  return container;
}

export function toast(message: string, options: ToastOptions = {}): void {
  const { level = 'info', duration = 5000, action } = options;
  const host = ensureContainer();
  const node = el('div', { class: `toast toast--${level}`, role: 'status' }, [message]);
  if (action) {
    const btn = el('button', { type: 'button', class: 'toast__action' }, [action.label]);
    btn.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
    node.appendChild(btn);
  }
  const closeBtn = el('button', { type: 'button', class: 'toast__close', 'aria-label': 'Cerrar' }, ['×']);
  closeBtn.addEventListener('click', () => dismiss());
  node.appendChild(closeBtn);
  host.appendChild(node);

  let timer: number | undefined;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    node.classList.add('toast--leaving');
    setTimeout(() => node.remove(), 200);
  };
  if (duration > 0) {
    timer = window.setTimeout(dismiss, duration);
  }
}
