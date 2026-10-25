// Cross-tab and in-tab real-time event synchronization for IDForge
// Uses BroadcastChannel API, storage events, and window custom events

export type SyncPayload = {
  type: 'RECORDS_UPDATED' | 'SUBMISSIONS_UPDATED' | 'FORMS_UPDATED' | 'TEMPLATES_UPDATED' | 'ALL';
  timestamp: number;
  sourceId?: string;
};

const SYNC_CHANNEL_NAME = 'idforge_realtime_sync';
let channel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not initialized:', e);
}

/**
 * Broadcast an update event across all open tabs, windows, and the current window.
 */
export function broadcastSync(type: SyncPayload['type'] = 'ALL', sourceId?: string) {
  const payload: SyncPayload = {
    type,
    timestamp: Date.now(),
    sourceId,
  };

  // 1. Post to BroadcastChannel (for other browser tabs & windows)
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch {
      // channel might be closed
    }
  }

  // 2. Dispatch custom event on current window (for current page components)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('idforge_sync', { detail: payload }));
      // 3. Update localStorage key to fire 'storage' events across browser tabs
      localStorage.setItem('idforge_sync_tick', `${type}_${payload.timestamp}`);
    } catch {
      // ignore storage quota / sandbox issues
    }
  }
}

/**
 * Subscribe to real-time sync updates across tabs, focus, and storage events.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToSync(callback: (payload: SyncPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<SyncPayload>;
    callback(custom.detail || { type: 'ALL', timestamp: Date.now() });
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'idforge_sync_tick' && e.newValue) {
      const parts = e.newValue.split('_');
      const type = (parts[0] || 'ALL') as SyncPayload['type'];
      const timestamp = parseInt(parts[1] || `${Date.now()}`, 10);
      callback({ type, timestamp });
    }
  };

  const handleBroadcast = (e: MessageEvent<SyncPayload>) => {
    if (e.data && e.data.timestamp) {
      callback(e.data);
    }
  };

  const handleFocusOrVisible = () => {
    if (!document.hidden) {
      callback({ type: 'ALL', timestamp: Date.now() });
    }
  };

  window.addEventListener('idforge_sync', handleCustomEvent);
  window.addEventListener('storage', handleStorage);
  window.addEventListener('focus', handleFocusOrVisible);
  document.addEventListener('visibilitychange', handleFocusOrVisible);
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('idforge_sync', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('focus', handleFocusOrVisible);
    document.removeEventListener('visibilitychange', handleFocusOrVisible);
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
  };
}
