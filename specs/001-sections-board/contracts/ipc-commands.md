# Contract: Tauri IPC (webview ⇄ Rust)

**Feature**: `001-sections-board` | **Date**: 2026-10-10

The Rust surface is intentionally tiny. Everything not listed here is either a built-in Tauri
API enabled by a single permission, or does not exist.

## Custom commands

### `load_document`

```ts
invoke<LoadResult>('load_document', { quarantine?: boolean }): Promise<LoadResult>

type LoadResult =
  | { kind: 'ok'; json: string }                       // contents of focusboard.json
  | { kind: 'recovered'; json: string; reason: string } // main file unreadable → .bak used
  | { kind: 'empty' }                                  // first launch, no file yet
```

- Reads `<app_data_dir>/focusboard.json`. If missing → `empty`.
- If the main file fails to *read or parse as JSON*, tries `focusboard.json.bak` → `recovered`
  and renames the damaged file to `focusboard.corrupt-<epoch>.json` (never deleted).
- **Schema validation and migrations happen in TypeScript**, not Rust — Rust only guarantees
  bytes and JSON syntax. Rationale: one schema source (Zod), tested in the domain layer.
- `quarantine: true` is used when the TypeScript schema check rejects the loaded file: Rust
  renames `focusboard.json` → `focusboard.corrupt-<epoch>.json`, then promotes
  `focusboard.json.bak` to `focusboard.json` and returns it as `recovered`, or returns `empty`
  if there is no backup. Calling it again quarantines the promoted file too. No file is ever
  overwritten or deleted, so a later `save_document` cannot destroy damaged data.
- Errors: `Err(String)` only for I/O failures where neither file is usable; the UI shows a
  blocking dialog with "Start fresh" and the data-folder path as selectable text (no `opener`
  permission is granted, see Constitution VI).

### `save_document`

```ts
invoke<void>('save_document', { json: string }): Promise<void>
```

- Preconditions: `json.length ≤ 10 MB` (reject otherwise — protects against runaway state).
- Algorithm: write `focusboard.json.tmp` → `sync_all()` → if `focusboard.json` exists, rename
  it to `focusboard.json.bak` → rename `.tmp` → `focusboard.json`.
  (On Windows, `std::fs::rename` replaces an existing destination file.)
- Serialized: a `Mutex` around the save path guarantees two saves never interleave.
- Idempotent: saving the same JSON twice is harmless.

### `schedule_timer_completion`

```ts
invoke<void>('schedule_timer_completion', {
  sessionId: string,
  endsAtMs: number,          // epoch ms
  title: string,             // e.g. "Focus session complete"
  body: string,              // e.g. "Time for a 5-minute break."
}): Promise<void>
```

- Cancels any previously scheduled completion (only one timer exists).
- Spawns an async task that sleeps until `endsAtMs` (re-checking the wall clock on wake to
  survive system sleep), then: sends a native notification via `tauri-plugin-notification`
  and emits the event below.
- If `endsAtMs` is already in the past, fires immediately.

### `cancel_timer_completion`

```ts
invoke<void>('cancel_timer_completion', { sessionId: string }): Promise<void>
```

- No-op if `sessionId` is not the currently scheduled one (avoids races between a late cancel
  and a newer session).

## Events (Rust → webview)

| Event | Payload | When |
|---|---|---|
| `pomodoro://completed` | `{ sessionId: string; firedAtMs: number }` | Scheduled completion fired. The UI applies `complete(now)` only if `sessionId` matches the current session. |

## Built-in APIs used (no custom Rust)

| Need | API | Permission in `capabilities/default.json` |
|---|---|---|
| Pin on top | `getCurrentWindow().setAlwaysOnTop(bool)` | `core:window:allow-set-always-on-top` |
| Read pinned state on launch | `getCurrentWindow().isAlwaysOnTop()` | `core:window:allow-is-always-on-top` |
| Event listening | `listen('pomodoro://completed', …)` | `core:event:default` |
| Window size/position | `tauri-plugin-window-state` (Rust-side, automatic) | none (no webview access needed) |
| Notification permission check | `isPermissionGranted()` / `requestPermission()` | `notification:default` |

**Explicitly NOT granted**: `core:default` (bundles path, menu, tray, webview, image and
resources permissions the app does not use), `window-state:*`, `fs:*`, `shell:*`, `http:*`, `opener:*`. No remote URLs are
loaded; CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'`
(`unsafe-inline` styles are required by React Flow's inline positioning styles — scripts stay
strict).

## Frontend ports (TypeScript) that wrap the above

See [platform-ports.ts](./platform-ports.ts). Production adapters live in
`src/platform/tauri/`; in-memory fakes for tests live in `src/platform/fake/`.
