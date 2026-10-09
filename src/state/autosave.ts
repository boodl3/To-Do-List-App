import type { AppDocument } from '../domain/schema';
import type { DocumentStore } from '../platform/ports';

interface DocSource {
  getDoc(): AppDocument;
  subscribe(listener: () => void): () => void;
}

/** Debounced save (FR-028): 500 ms after the last change, never more than 1 s after the first. */
export function startAutosave(
  source: DocSource,
  store: DocumentStore,
  {
    onError,
    debounceMs = 500,
    maxWaitMs = 1000,
  }: { onError: (e: unknown) => void; debounceMs?: number; maxWaitMs?: number },
) {
  let lastSeen = source.getDoc();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstDirtyAt: number | null = null;
  let inFlight: Promise<void> | null = null;

  // Writes start immediately when idle and queue behind an in-flight save otherwise, so saves
  // land in order; a queued write serializes the newest document when it runs.
  const save = (): Promise<void> => {
    clearTimeout(timer);
    timer = undefined;
    if (firstDirtyAt === null) return inFlight ?? Promise.resolve();
    firstDirtyAt = null;
    const write = () => store.save(JSON.stringify(source.getDoc()));
    const tracked: Promise<void> = (inFlight ? inFlight.then(write) : write())
      .catch(onError)
      .finally(() => {
        if (inFlight === tracked) inFlight = null;
      });
    inFlight = tracked;
    return tracked;
  };

  const unsubscribe = source.subscribe(() => {
    const doc = source.getDoc();
    if (doc === lastSeen) return;
    lastSeen = doc;
    const now = Date.now();
    firstDirtyAt ??= now;
    clearTimeout(timer);
    timer = setTimeout(
      () => void save(),
      Math.max(0, Math.min(debounceMs, firstDirtyAt + maxWaitMs - now)),
    );
  });

  return {
    flush: save,
    stop() {
      clearTimeout(timer);
      unsubscribe();
    },
  };
}
