export function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

export function $$<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

type AttrValue = string | boolean | number | undefined | null | Record<string, string>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === undefined || value === null) continue;
    if (key.startsWith('on')) continue; // no inline handlers
    if (key === 'class' && (typeof value === 'string' || typeof value === 'number')) {
      node.className = String(value);
      continue;
    }
    if (key === 'dataset' && typeof value === 'object') {
      Object.assign(node.dataset, value);
      continue;
    }
    if (value === true) {
      node.setAttribute(key, '');
    } else if (typeof value === 'string' || typeof value === 'number') {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** Safe HTML string — escape for use in .innerHTML contexts. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(event, handler as EventListener, options);
  return () => target.removeEventListener(event, handler as EventListener, options);
}

export function delegate<K extends keyof HTMLElementEventMap>(
  root: HTMLElement,
  event: K,
  selector: string,
  handler: (ev: HTMLElementEventMap[K], target: HTMLElement) => void,
): () => void {
  const listener = (e: Event) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(selector);
    if (target && root.contains(target)) {
      handler(e as HTMLElementEventMap[K], target);
    }
  };
  root.addEventListener(event, listener);
  return () => root.removeEventListener(event, listener);
}
