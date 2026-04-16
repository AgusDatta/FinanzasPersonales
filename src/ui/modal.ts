import { el } from '@utils/dom.ts';

export interface ModalOptions {
  title: string;
  content: HTMLElement;
  onClose?: () => void;
  dismissible?: boolean;
}

export function openModal(options: ModalOptions): { close: () => void } {
  const { title, content, onClose, dismissible = true } = options;
  const backdrop = el('div', { class: 'modal-backdrop', role: 'presentation' });
  const dialog = el('div', {
    class: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title',
    tabindex: '-1',
  });
  const heading = el('h2', { id: 'modal-title', class: 'modal__title' }, [title]);
  const closeBtn = el('button', {
    type: 'button',
    class: 'modal__close',
    'aria-label': 'Cerrar',
  }, ['×']);
  dialog.append(closeBtn, heading, content);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  const previousActive = document.activeElement as HTMLElement | null;
  setTimeout(() => {
    const firstInput = dialog.querySelector<HTMLElement>('input,select,textarea,button');
    (firstInput ?? dialog).focus();
  }, 20);

  const close = () => {
    backdrop.remove();
    previousActive?.focus();
    onClose?.();
    document.removeEventListener('keydown', onEsc);
  };
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dismissible) close();
  };
  document.addEventListener('keydown', onEsc);
  closeBtn.addEventListener('click', close);
  if (dismissible) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }

  // Basic focus trap
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'input,select,textarea,button,[tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return { close };
}

export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const content = el('div', { class: 'confirm' });
    content.appendChild(el('p', { class: 'confirm__message' }, [message]));
    const actions = el('div', { class: 'confirm__actions' });
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Cancelar']);
    const ok = el('button', { type: 'button', class: 'btn btn--danger' }, ['Sí, eliminar']);
    actions.append(cancel, ok);
    content.appendChild(actions);
    const { close } = openModal({
      title: 'Confirmar',
      content,
      onClose: () => resolve(false),
    });
    cancel.addEventListener('click', () => {
      close();
    });
    ok.addEventListener('click', () => {
      resolve(true);
      close();
    });
  });
}
