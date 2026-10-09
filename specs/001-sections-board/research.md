# Phase 0 Research: Sections Board with Pomodoro

**Feature**: `001-sections-board` | **Date**: 2026-10-10 | **Plan**: [plan.md](./plan.md)

Each decision lists what was chosen, why, and what was rejected. Versions are the major lines
current as of October 2026 — pin exact versions in the lockfiles at scaffold time.

---

## R1. Desktop shell — **Tauri 2**

**Decision**: Tauri 2.x (Rust core + the OS webview: WebView2 on Windows, WKWebView on macOS,
WebKitGTK on Linux).

**Rationale**
- Native "always on top" (`setAlwaysOnTop`), native notifications, and per-command permission
  allow-lists ("capabilities") — the latter maps directly to Constitution VI.
- Small footprint: bundles are typically single-digit to low-tens of MB with modest idle RAM,
  helping Constitution V (< 250 MB idle).
- The UI is still web tech (React), so the canvas/drag ecosystem is available.

**Alternatives considered**
| Option | Why not |
|---|---|
| Electron | Same web UI, simpler single-language stack, but ships a full Chromium + Node (larger binary, higher idle memory) and its security model needs more manual hardening (context isolation, sandbox, IPC validation). Reasonable fallback if Rust becomes a blocker. |
| Python + PySide6 (Qt) | You already know it from GoldLedger, and `Qt::WindowStaysOnTopHint` is trivial. But a free-form canvas of rich, editable, resizable cards with arrows is far more code in `QGraphicsScene` than with React Flow, and the reference UI style is much easier to hit with CSS. |
| Flutter desktop | Good rendering, but desktop plugins (always-on-top, notifications) are less mature and the node-graph ecosystem is thin. |

**Trade-off to accept**: a second language (Rust). Mitigation: Rust surface is kept tiny
(≈ 4 commands + plugin setup) — see [contracts/ipc-commands.md](./contracts/ipc-commands.md).

---

## R2. UI framework — **React 19 + TypeScript (strict) + Vite**

**Rationale**: largest ecosystem for the libraries chosen below; first-class Tauri templates;
strict TS satisfies the Technology Standards. Vite gives fast HMR inside the Tauri window.

**Alternatives**: Svelte 5 + Svelte Flow (smaller and arguably simpler, same xyflow core —
a legitimate choice; rejected only because React skills transfer more broadly for a CS student's
portfolio and job search).

---

## R3. Board canvas (sections, pan/zoom, resize, arrows) — **@xyflow/react (React Flow 12)**

**Decision**: React Flow 12 (`@xyflow/react`). Sections are *custom nodes*; connections are
*custom edges*.

**Rationale** — it already provides, out of the box:
- Dragging nodes, panning, zooming, multi-select, add/remove — built in.
- `<NodeResizer />` for resizing a node from all edges/corners with `minWidth/minHeight`.
- `snapToGrid` + `snapGrid={[8, 8]}` for FR-003.
- Edge markers (arrowheads) and edge labels for FR-016; `onConnect`/`isValidConnection` for
  FR-018 (reject self/duplicate connections).
- A built-in `colorMode` prop ("light" | "dark" | "system") plus CSS variables, which we
  override with our own tokens.
- MIT licensed and actively maintained (12.x releases ongoing).

**Things we build on top**: alignment guides ("helper lines") during drag (FR-004), Tidy-up
layout (FR-005), free-spot placement (FR-006). These are pure functions in `domain/layout/`.

**Alternatives considered**
| Option | Why not |
|---|---|
| tldraw SDK | Excellent whiteboard, but its SDK license requires a license key/watermark for production use, and it's built around freeform shapes rather than rich editable list cards. |
| Konva / plain `<canvas>` | Canvas-rendered text inputs, checkboxes and focus management mean rebuilding accessibility and text editing from scratch (violates Constitution IV keyboard/a11y rules). |
| Hand-rolled DOM + pointer events | Possible and educational, but pan/zoom math, hit-testing edges, and resize handles are weeks of work that React Flow already solves. YAGNI. |

**Integration gotcha**: interactive elements inside a node (inputs, checkboxes, the task list's
own drag handles) must carry React Flow's `nodrag` (and `nowheel` for the scroll area) classes,
otherwise typing or scrolling drags/zooms the board.

---

## R4. State management & undo/redo — **Zustand 5 + Immer, snapshot history in the state layer**

**Decision**
- One Zustand store holding the `AppDocument` (see data-model.md); updates via Immer so every
  state is an immutable, structurally shared snapshot.
- Undo/redo = a bounded stack (100) of previous `board` snapshots. Because snapshots share
  unchanged branches, 100 entries cost roughly "100 × the changed parts", not 100 × the board.
- **Gesture coalescing**: a drag or resize produces one history entry, committed on pointer-up
  (not one per mouse-move).
- All mutations call pure domain functions (`addTask(board, sectionId, text)` …); the store
  is only glue. This keeps Constitution III and makes the logic unit-testable without React.

**Why not the Command pattern (do/undo pairs)?** It's more memory-efficient, but every command
needs a hand-written inverse — twice the code and twice the bugs. With immutable snapshots,
undo is correct by construction. Trade-off: slightly more memory, far less code.

**Alternatives**: Redux Toolkit (more ceremony for a solo app); `zundo` middleware (fine, but
gesture coalescing is easier to control ourselves — revisit if our history code grows).

---

## R5. Persistence — **single JSON document, written atomically by Rust**

**Decision**
- One file `focusboard.json` in the OS app-data directory (Tauri `app_data_dir`).
- Two custom Rust commands: `load_document` and `save_document` (contract in
  [contracts/ipc-commands.md](./contracts/ipc-commands.md)).
- `save_document` writes `focusboard.json.tmp`, `fsync`s it, rotates the current file to
  `focusboard.json.bak`, then atomically renames the temp file into place.
- The frontend debounces saves (500 ms after the last change, max wait 1 s) — FR-028.
- Window size/position persisted by `tauri-plugin-window-state`.
- Runtime validation at the boundary with **Zod 4** (schema → TS types and the published JSON
  Schema in contracts/ are generated from one source). Older `schemaVersion`s pass through
  explicit, unit-tested migrations (Constitution I).

**Why not…**
| Option | Why not |
|---|---|
| SQLite (`tauri-plugin-sql`) | The data is one small tree-shaped document (< 1 MB even for heavy use). Mapping it to tables adds a schema, migrations and joins for no benefit. Revisit if multiple boards/search arrive. |
| `tauri-plugin-store` | Fine for preferences, but it exposes a generic key-value store to the UI and gives less control over atomic-write + backup semantics. |
| `tauri-plugin-fs` from JS | Would grant the webview filesystem access — wider than needed (Constitution VI). Two narrow commands are safer. |
| `localStorage` | Lives inside the webview profile, can be cleared, no atomicity guarantees. |

---

## R6. Pomodoro accuracy while in the background

**Problem**: webviews throttle JavaScript timers when the window is hidden/minimized (Chromium-
based WebView2 can delay timers to about once per minute after a while). A `setInterval` that
counts down "one tick per second" drifts, and a completion check might fire late.

**Decision**
1. **Display**: the state stores `endsAt` (epoch ms). Remaining time is always
   `max(0, endsAt − now)`; the UI re-renders on a 250 ms interval while visible. Throttling
   can delay a repaint but can never make the number wrong.
2. **Completion**: when a session starts, the UI calls the Rust command
   `schedule_timer_completion(sessionId, endsAtMs)`. A Tokio task sleeps until `endsAt`, then
   sends the native notification and emits `pomodoro://completed`. Rust isn't throttled.
   Pause/Reset/Skip call `cancel_timer_completion(sessionId)`.
3. **Restart recovery**: on launch, if a stored session's `endsAt` is in the past it is
   marked completed; otherwise completion is re-scheduled (FR-021, spec US3-8).
4. Domain logic is a pure state machine: `(state, event, now) → state` — unit-tested without
   real time.

**Rejected**: Web Worker timers (also throttled in some webviews); disabling throttling via
webview flags (platform-specific and fragile).

---

## R7. Always on top — **Tauri window API**

`getCurrentWindow().setAlwaysOnTop(pinned)` from `@tauri-apps/api/window`, enabled by the
single permission `core:window:allow-set-always-on-top` in `capabilities/default.json`.
The call returns a promise; the UI only shows the pinned state after it resolves (spec US5-4).
Platform note: on macOS, "always on top" does not float above full-screen apps in other Spaces —
document as a known limitation.

---

## R8. Styling & design tokens — **CSS custom properties + CSS Modules**

**Decision**
- `tokens.css` defines every token as a CSS variable; `themes.css` maps semantic tokens
  (`--surface`, `--text`, `--accent-*`) for `[data-theme="light"]` and `[data-theme="dark"]`.
- Components use CSS Modules that reference only variables (lint rule: no raw hex/px in modules
  except `0` and `1px` hairlines — enforced with Stylelint).
- React Flow's own CSS variables are mapped onto ours so canvas chrome matches.

**Why not Tailwind 4?** Its CSS-first `@theme` would also work well. Rejected only to keep the
dependency count and mental model small; CSS variables are the actual source of truth either way.

**Token draft (from the reference images)**
| Token | Value |
|---|---|
| Spacing scale | 4, 8, 16, 24, 32, 48, 64 px (`--space-1` … `--space-7`) |
| Section gap (board) | 24 px (`--board-gap`) |
| Radii | section 24 px, inner chips/rows 12 px, pills 999 px, timer widget 28 px |
| Dark surfaces | board `#0A0A0C`, card `#141418`, raised `#1E1E24`, hairline `#2A2A32` |
| Light surfaces | board `#F2F2F0`, card `#FFFFFF`, raised `#F7F7F5`, hairline `#E4E4E0`, soft shadow |
| Accents (section palette) | orange `#FF7A1A`, mint `#2EE6A6`, pink `#FF4F9A`, yellow `#FFD60A`, violet `#A970FF`, sky `#4CC9F0` |
| Type | Inter (variable, bundled locally — no remote fonts under CSP), `font-variant-numeric: tabular-nums` for all times; timer numerals 56/64 px semibold |
| Motion | 150 ms ease-out for hover/press, 220 ms for theme cross-fade; disabled under `prefers-reduced-motion` |

**Contrast rule**: vivid accents are used for *fills and strokes*, with an `--on-accent` text
color per accent. In light mode, accent-colored *text* uses a darker variant (e.g. yellow →
`#8A6D00`) so it passes 4.5:1. Verify each pair with an automated contrast test.

**Visual motifs to borrow**: segmented progress bar (the espresso/charging widgets) for section
progress and the timer; large numerals with small unit labels (`1h 30m` → **1h** 30m); one vivid
accent per card on a dark card; soft frosted light theme (third image).

---

## R9. Task reordering inside a section — **@dnd-kit/core + @dnd-kit/sortable**

Accessible sortable lists with keyboard support. Keyboard shortcuts `Alt+↑/↓` also move tasks.
Drag handles carry `nodrag` so they don't drag the section. Alternative: native HTML5 DnD —
poor keyboard/a11y story and inconsistent in WKWebView.

---

## R10. Icons, notifications, sound

- **Icons**: `lucide-react` (Sun, Moon, Pin, PinOff, Timer, Plus, Undo2, Redo2, LayoutGrid) —
  ISC license, tree-shakeable.
- **Notifications**: `tauri-plugin-notification` (sent from Rust in R6).
- **Sound**: a short bundled `.ogg`/`.mp3` played via `HTMLAudioElement`; toggle in settings.

---

## R11. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Domain (pure TS) | **Vitest** + **fast-check** | estimate parsing, roll-ups, completion propagation, Pomodoro state machine, snapping, tidy-up, placement, migrations. Property tests: "tidy-up never produces overlaps and every adjacent gap = 24 px"; "parse(format(m)) = m". |
| State | Vitest | store actions, undo/redo, gesture coalescing, autosave debounce (fake timers). |
| Components | Vitest + **React Testing Library** + `@testing-library/user-event` | Section/Task keyboard flows, estimate field validation, theme toggle a11y labels. |
| End-to-end | **Playwright** against the Vite build with **fake platform adapters** | User stories 1–6 as Given/When/Then; visual snapshots in both themes; `@axe-core/playwright` for a11y + contrast. |
| Rust | `cargo test` | atomic write/backup/recovery on a temp dir; timer scheduler cancel/fire. |
| Smoke on real shell | Manual checklist in quickstart.md | pin-on-top, notifications, background accuracy (OS-specific behaviour). |

**Why Playwright against the browser build, not the Tauri window?** Tauri's WebDriver support
doesn't cover macOS. Because the platform layer is behind ports (Constitution III), the same UI
runs in plain Chromium with in-memory fakes — fast, deterministic CI. The few truly native
behaviours are covered by Rust tests plus a short manual smoke test.

---

## R12. Tooling

pnpm, ESLint (typescript-eslint strict), Prettier, Stylelint, `rustfmt`, `clippy`,
`cargo audit`, GitHub Actions (lint → unit → e2e on ubuntu; `tauri build` on windows + macos).

---

## R13. Runtime dependency register (Constitution: Technology & Quality Standards)

| Dependency | Purpose | License | Alternative considered |
|---|---|---|---|
| `react`, `react-dom` | UI | MIT | Svelte 5 (R2) |
| `@xyflow/react` | Board canvas | MIT | tldraw, Konva (R3) |
| `zustand` | Store | MIT | Redux Toolkit (R4). Immer dropped at implementation: domain functions already return new, structurally shared objects via spreads |
| `zod` | Schema + validation | MIT | hand-written type guards |
| `@dnd-kit/core`, `@dnd-kit/sortable` | Task reorder | MIT | native HTML5 DnD (R9) |
| `lucide-react` | Icons | ISC | inline SVGs |
| `tauri`, `@tauri-apps/api` | Shell + IPC | MIT / Apache-2.0 | Electron (R1) |
| `tauri-plugin-notification` (+ JS) | Native notifications | MIT / Apache-2.0 | none built in |
| `tauri-plugin-window-state` | Window size/position | MIT / Apache-2.0 | hand-rolled in `storage.rs` |
| `tokio` (already a Tauri dependency) | Timer sleep/cancel | MIT | `std::thread` + sleep (cancellation is messier) |
| `serde`, `serde_json` | IPC (de)serialization | MIT / Apache-2.0 | none |
| `@fontsource-variable/inter` (Inter, bundled locally) | Typography | SIL OFL 1.1 | system font stack |
