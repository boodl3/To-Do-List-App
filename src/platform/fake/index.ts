import type {
  CompletionPayload,
  DocumentStore,
  LoadResult,
  Platform,
  TimerScheduler,
  WindowControls,
} from '../ports';
import { matchMediaTheme } from '../systemTheme';

/**
 * In-memory/localStorage adapters for `pnpm dev`, unit tests and Playwright. The document store
 * mirrors the Rust semantics in contracts/ipc-commands.md (rotate to .bak, set damaged files aside).
 */
const MAIN = 'focusboard.json';
const BAK = 'focusboard.json.bak';

export function fakeDocumentStore(storage: Storage = localStorage): DocumentStore {
  const setAside = (json: string) => {
    let n = 0;
    while (storage.getItem(`focusboard.corrupt-${n}.json`) !== null) n++;
    storage.setItem(`focusboard.corrupt-${n}.json`, json);
    storage.removeItem(MAIN);
  };
  return {
    load({ quarantine = false } = {}): Promise<LoadResult> {
      let reason: string | undefined;
      const current = storage.getItem(MAIN);
      if (quarantine && current !== null) {
        setAside(current);
        reason = 'the saved board failed validation';
      }
      for (;;) {
        const json = storage.getItem(MAIN);
        if (json === null) {
          const bak = storage.getItem(BAK);
          if (bak === null) return Promise.resolve({ kind: 'empty', ...(reason && { reason }) });
          storage.setItem(MAIN, bak);
          storage.removeItem(BAK);
          reason ??= 'the last save was interrupted';
          continue;
        }
        try {
          JSON.parse(json);
          return Promise.resolve(
            reason ? { kind: 'recovered', json, reason } : { kind: 'ok', json },
          );
        } catch (e) {
          setAside(json);
          reason = `the saved board could not be read (${String(e)})`;
        }
      }
    },
    save(json) {
      const previous = storage.getItem(MAIN);
      if (previous !== null) storage.setItem(BAK, previous);
      storage.setItem(MAIN, json);
      return Promise.resolve();
    },
  };
}

export function fakeClock() {
  let offset = 0;
  return { now: () => Date.now() + offset, advance: (ms: number) => (offset += ms) };
}

export function fakeTimer(clock: { now(): number }) {
  let scheduled: { sessionId: string; endsAtMs: number } | null = null;
  let handle: ReturnType<typeof setTimeout> | undefined;
  const handlers = new Set<(p: CompletionPayload) => void>();

  const fire = () => {
    if (!scheduled) return;
    const payload = { sessionId: scheduled.sessionId, firedAtMs: clock.now() };
    scheduled = null;
    clearTimeout(handle);
    handlers.forEach((h) => {
      h(payload);
    });
  };
  /** Re-arm against the (possibly advanced) clock; fires at once when already due. */
  const check = () => {
    clearTimeout(handle);
    if (!scheduled) return;
    const delay = scheduled.endsAtMs - clock.now();
    if (delay <= 0) fire();
    else handle = setTimeout(check, delay);
  };

  const timer: TimerScheduler = {
    schedule({ sessionId, endsAtMs }) {
      scheduled = { sessionId, endsAtMs };
      check();
      return Promise.resolve();
    },
    cancel(sessionId) {
      if (scheduled?.sessionId === sessionId) {
        scheduled = null;
        clearTimeout(handle);
      }
      return Promise.resolve();
    },
    onCompleted(handler) {
      handlers.add(handler);
      return Promise.resolve(() => {
        handlers.delete(handler);
      });
    },
  };
  return { timer, check, fireNow: fire };
}

export function fakeWindow() {
  let pinned = false;
  let refuse = false;
  const controls: WindowControls = {
    setPinned(next) {
      if (!refuse) pinned = next;
      return Promise.resolve(pinned);
    },
    isPinned: () => Promise.resolve(pinned),
  };
  return { controls, refusePin: (value = true) => (refuse = value) };
}

export interface FakeHandles {
  clock: { advance(ms: number): void };
  window: { refusePin(value?: boolean): void };
  timer: { fireNow(): void };
}

declare global {
  interface Window {
    __focusboardFake?: FakeHandles;
  }
}

/** Loads `?fixture=<name>` into storage once per tab session (reloads keep the edited board). */
async function applyFixture(storage: Storage) {
  const name = new URLSearchParams(location.search).get('fixture');
  if (!name || !/^[\w-]+$/.test(name) || sessionStorage.getItem('focusboard.fixture') === name) {
    return;
  }
  const res = await fetch(`/fixtures/${name}.json`);
  if (!res.ok) return;
  storage.removeItem(BAK);
  storage.setItem(MAIN, await res.text());
  sessionStorage.setItem('focusboard.fixture', name);
}

export function createFakePlatform(storage: Storage = localStorage): Platform {
  const clock = fakeClock();
  const timer = fakeTimer(clock);
  const win = fakeWindow();
  const store = fakeDocumentStore(storage);
  window.__focusboardFake = {
    clock: {
      advance(ms) {
        clock.advance(ms);
        timer.check();
      },
    },
    window: { refusePin: win.refusePin },
    timer: { fireNow: timer.fireNow },
  };
  return {
    store: {
      async load(opts) {
        await applyFixture(storage);
        return store.load(opts);
      },
      save: (json) => store.save(json),
    },
    window: win.controls,
    timer: timer.timer,
    clock,
    systemTheme: matchMediaTheme(),
  };
}
