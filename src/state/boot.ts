import { emptyDocument } from '../domain/defaults';
import { loadDocument } from '../domain/migrations';
import type { AppDocument } from '../domain/schema';
import type { DocumentStore, Platform } from '../platform/ports';
import { startAutosave } from './autosave';
import type { AppStore } from './store';

export const RESTORED_NOTICE = 'Your board was restored from a backup.';
export const SET_ASIDE_NOTICE =
  "Your saved board couldn't be read, so it was set aside and you're starting fresh.";

/**
 * Load → validate; a document that fails validation is quarantined and the backup tried next,
 * until one validates or nothing is left. Damaged files are never overwritten (spec Edge Cases).
 */
export async function loadInitialDocument(
  store: DocumentStore,
  now: number,
): Promise<{ doc: AppDocument; notice: string | null }> {
  let result = await store.load();
  let quarantined = false;
  for (;;) {
    if (result.kind === 'empty') {
      const lost = quarantined || result.reason !== undefined;
      return { doc: emptyDocument(now), notice: lost ? SET_ASIDE_NOTICE : null };
    }
    const loaded = loadDocument(result.json);
    if (loaded.ok) {
      const restored = quarantined || result.kind === 'recovered';
      return { doc: loaded.doc, notice: restored ? RESTORED_NOTICE : null };
    }
    result = await store.load({ quarantine: true });
    quarantined = true;
  }
}

function autosave(platform: Platform, store: AppStore) {
  const { flush } = startAutosave(
    { getDoc: () => store.getState().doc, subscribe: store.subscribe },
    platform.store,
    {
      onError: (e) => {
        store.getState().setNotice(`Couldn't save your board: ${String(e)}`);
      },
    },
  );
  window.addEventListener('beforeunload', () => void flush());
}

export async function boot(platform: Platform, store: AppStore): Promise<void> {
  try {
    const { doc, notice } = await loadInitialDocument(platform.store, platform.clock.now());
    store.getState().hydrate(doc);
    store.getState().setNotice(notice);
  } catch (e) {
    store.getState().fail(String(e));
    return;
  }
  autosave(platform, store);
}

/** Used by the load-error dialog after an unrecoverable I/O failure. */
export function startFresh(platform: Platform, store: AppStore): void {
  store.getState().hydrate(emptyDocument(platform.clock.now()));
  autosave(platform, store);
}
