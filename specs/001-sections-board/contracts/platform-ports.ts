/**
 * Platform ports — the only way UI/state code touches the OS.
 *
 * Why ports? (Constitution III) Domain and state code depend on these interfaces, never on
 * `@tauri-apps/*` directly. Production adapters wrap Tauri; tests inject in-memory fakes,
 * which is what lets the whole UI run under Playwright in a plain browser.
 */

export type LoadResult =
  | { kind: 'ok'; json: string }
  | { kind: 'recovered'; json: string; reason: string }
  | { kind: 'empty' };

export interface DocumentStore {
  /** `quarantine: true` sets the current file aside and promotes the backup (see ipc-commands.md). */
  load(opts?: { quarantine?: boolean }): Promise<LoadResult>;
  /** Atomic on the Rust side; callers may fire-and-forget but should surface rejections. */
  save(json: string): Promise<void>;
}

export interface WindowControls {
  /** Resolves to the state the OS actually applied (may differ from the request). */
  setPinned(pinned: boolean): Promise<boolean>;
  isPinned(): Promise<boolean>;
}

export interface CompletionPayload {
  sessionId: string;
  firedAtMs: number;
}

export interface TimerScheduler {
  schedule(args: { sessionId: string; endsAtMs: number; title: string; body: string }): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  /** Returns an unsubscribe function. */
  onCompleted(handler: (payload: CompletionPayload) => void): Promise<() => void>;
}

export interface Clock {
  /** Epoch milliseconds. Injected so domain/state logic never reads a global clock. */
  now(): number;
}

export interface SystemTheme {
  prefersDark(): boolean;
  onChange(handler: (prefersDark: boolean) => void): () => void;
}

export interface Platform {
  store: DocumentStore;
  window: WindowControls;
  timer: TimerScheduler;
  clock: Clock;
  systemTheme: SystemTheme;
}
