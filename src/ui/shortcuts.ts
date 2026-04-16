/**
 * Keyboard shortcut registry. Supports single keys, modifiers, and chord sequences ("g d").
 * Handlers are not invoked when the user is typing in an input/textarea.
 */
type Handler = (e: KeyboardEvent) => void;

const handlers = new Map<string, Handler>();
let chordBuffer = '';
let chordTimer: number | undefined;

function normalize(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function register(shortcut: string, handler: Handler): () => void {
  handlers.set(shortcut.toLowerCase(), handler);
  return () => handlers.delete(shortcut.toLowerCase());
}

export function init(): void {
  document.addEventListener('keydown', (e) => {
    if (isTyping(e.target)) return;
    const key = normalize(e);
    // Single-key handler
    const direct = handlers.get(key);
    if (direct) {
      e.preventDefault();
      direct(e);
      chordBuffer = '';
      return;
    }
    // Chord handler
    if (/^[a-z]$/.test(e.key)) {
      chordBuffer = (chordBuffer + ' ' + e.key.toLowerCase()).trim();
      const chord = handlers.get(chordBuffer);
      if (chord) {
        e.preventDefault();
        chord(e);
        chordBuffer = '';
      } else {
        if (chordTimer) clearTimeout(chordTimer);
        chordTimer = window.setTimeout(() => (chordBuffer = ''), 800);
      }
    }
  });
}
