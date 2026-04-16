/**
 * Cross-tab sync: when another tab edits data, we reload our state.
 */
const CHANNEL_NAME = 'finanzas-personales-sync';
let channel: BroadcastChannel | null = null;

export function initBroadcast(onRemoteChange: () => void): void {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener('message', (e) => {
    if (e.data?.type === 'data-changed') onRemoteChange();
  });
}

export function broadcastChange(): void {
  channel?.postMessage({ type: 'data-changed', at: Date.now() });
}
