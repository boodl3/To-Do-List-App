# Implementation Plan: Sections Board with Pomodoro

**Branch**: `001-sections-board` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-sections-board/spec.md`

## Summary

A local-first desktop whiteboard where the user creates rounded **sections** (to-do lists with
tasks, one level of subtasks, and rolled-up time estimates), arranges and resizes them freely
on a pannable/zoomable board with grid snapping, alignment guides and a "Tidy up" action,
links them with **arrows/lines**, and focuses with a **draggable Pomodoro** widget. A sun/moon
toggle switches light/dark themes and a pin button keeps the window always on top.

**Technical approach**: Tauri 2 shell (tiny Rust surface: atomic JSON persistence + a native
completion scheduler for the timer) hosting a React 19 + TypeScript UI. The board is built on
React Flow 12 (sections = custom nodes with `NodeResizer`, connections = custom edges). All
rules — estimates, completion propagation, snapping, placement, tidy-up, the Pomodoro state
machine, migrations — live in a pure, test-first `domain/` layer. OS access goes through
injected platform ports so the full UI is testable in a plain browser.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Rust stable (edition 2021)
**Primary Dependencies**: Tauri 2.x (+ `tauri-plugin-notification`, `tauri-plugin-window-state`),
React 19, Vite, `@xyflow/react` 12.x, Zustand 5 + Immer, Zod 4, `@dnd-kit/core` +
`@dnd-kit/sortable`, `lucide-react`. Rationale and rejected alternatives: [research.md](./research.md)
**Storage**: Single JSON document `focusboard.json` in the OS app-data dir, atomic write +
rolling `.bak`, `schemaVersion` + migrations ([data-model.md](./data-model.md))
**Testing**: Vitest + fast-check (domain/state), React Testing Library (components),
Playwright + `@axe-core/playwright` with fake platform adapters (E2E, visual, a11y),
`cargo test` (Rust)
**Target Platform**: Windows 10/11 (WebView2), macOS 13+ (WKWebView); Linux best-effort
**Project Type**: Desktop application (single repo: web frontend + Tauri shell)
**Performance Goals**: ≥ 60 fps drag/resize with 50 sections + 100 connections; cold start
< 2 s; autosave ≤ 1 s after last change; timer drift ≤ 1 s / 25 min
**Constraints**: offline-only; idle RAM < 250 MB (< 350 MB on boards of 50+ sections); no filesystem/shell/network permissions for the
webview; strict CSP; WCAG 2.2 AA in both themes; full keyboard operability
**Scale/Scope**: 1 user, 1 board, up to ~50 sections × ~50 tasks typical (hard caps 500/500);
≈ 15 UI components, ≈ 10 domain modules, 4 Rust commands

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Gate | Pre-design | Post-design |
|---|---|---|---|---|
| I | Local-First & Private | No network; atomic writes; versioned schema + migrations | ✅ | ✅ R5, `save_document` contract, data-model *Migrations* |
| II | Test-First | Domain modules listed with tests first; each user story has an acceptance test | ✅ | ✅ R11 matrix; tasks phase will order tests before code |
| III | Layered Architecture | `domain/` pure; ports for OS; canvas lib confined to `ui/` | ✅ | ✅ `contracts/platform-ports.ts`; React Flow types mapped in `ui/board/adapters.ts` |
| IV | Consistent Interface | Tokens single source; 8 pt grid + snapping; both themes AA; keyboard | ✅ | ✅ R8 tokens, FR-002–006, Stylelint rule, axe tests |
| V | Responsive by Budget | Budgets measurable in CI or manual perf check | ✅ | ✅ perf fixture (50/100) + Playwright trace; timer via `endsAt` (R6) |
| VI | Secure by Default | Minimal capabilities; CSP; no `fs`/`shell` to UI; audits | ✅ | ✅ contracts/ipc-commands.md permission table; `cargo audit`/`npm audit` in CI |
| VII | Simplicity & YAGNI | No extra projects/layers without justification | ⚠️ | ✅ two justified items in *Complexity Tracking* |

**Result**: PASS (with 2 justified complexity items).

## Project Structure

### Documentation (this feature)

```text
specs/001-sections-board/
├── spec.md              # /speckit-specify output
├── checklists/
│   └── requirements.md  # spec quality checklist
├── plan.md              # this file (/speckit-plan)
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── ipc-commands.md
│   ├── platform-ports.ts
│   └── app-document.schema.json
└── tasks.md             # Phase 2 — created by /speckit-tasks (NOT by this command)
```

### Source Code (repository root)

```text
src/
├── domain/                      # pure TS — no React, no Tauri, no DOM, no Date.now()
│   ├── ids.ts                   # branded ID types + newId()
│   ├── estimate.ts              # parse/format/validate estimates      (+ estimate.test.ts)
│   ├── tasks.ts                 # add/edit/move/indent/outdent/toggle  (+ tasks.test.ts)
│   ├── rollup.ts                # taskEstimate, sectionRemaining, progress (+ test)
│   ├── sections.ts              # create/rename/recolor/delete/resize  (+ test)
│   ├── connections.ts           # connect/validate/reverse/restyle     (+ test)
│   ├── layout/
│   │   ├── snap.ts              # grid snap                            (+ test)
│   │   ├── guides.ts            # alignment-guide candidates & snapping (+ test)
│   │   ├── placement.ts         # free-spot search                     (+ property test)
│   │   └── tidy.ts              # tidy-up rows                         (+ property test)
│   ├── pomodoro.ts              # state machine (state, event, now) → state (+ test)
│   ├── schema.ts                # Zod schemas → TS types; toJSONSchema()
│   ├── migrations.ts            # vN → vN+1                            (+ fixture tests)
│   └── defaults.ts              # empty document, default settings
├── state/
│   ├── store.ts                 # Zustand + Immer; actions call domain functions
│   ├── history.ts               # bounded snapshot undo/redo, gesture coalescing (+ test)
│   ├── autosave.ts              # debounced save via DocumentStore port   (+ test)
│   └── selectors.ts
├── platform/
│   ├── ports.ts                 # = contracts/platform-ports.ts
│   ├── tauri/                   # production adapters (only place importing @tauri-apps/*)
│   └── fake/                    # in-memory adapters for tests & browser dev
├── ui/
│   ├── app/                     # App shell, PlatformProvider, keyboard shortcuts
│   ├── toolbar/                 # Toolbar, ThemeToggle (sun/moon), PinButton, Undo/Redo, Tidy, Timer toggle
│   ├── board/                   # BoardCanvas (ReactFlow), SectionNode, ConnectionEdge,
│   │                            # AlignmentGuides, adapters.ts (domain ⇄ React Flow mapping)
│   ├── section/                 # SectionHeader, TaskList (dnd-kit), TaskRow, EstimateInput,
│   │                            # SegmentedProgress, AccentPicker
│   ├── pomodoro/                # PomodoroWidget (draggable overlay), PomodoroSettings
│   └── theme/                   # tokens.css, themes.css, reactflow-overrides.css, fonts/
└── main.tsx

src-tauri/
├── src/
│   ├── lib.rs                   # builder, plugins, command registration
│   ├── storage.rs               # load_document / save_document      (+ #[cfg(test)] tests)
│   └── timer.rs                 # schedule/cancel completion, emits event (+ tests)
├── capabilities/default.json    # least-privilege permissions (see contracts)
└── tauri.conf.json              # CSP, window config

tests/
├── e2e/                         # Playwright: us1-tasks.spec.ts … us6-connections.spec.ts,
│                                # themes.visual.spec.ts, a11y.spec.ts, perf.spec.ts
└── fixtures/                    # v1.json, large-board-50x100.json, corrupt.json
```

**Structure Decision**: single repository, single frontend package plus the `src-tauri` crate
(Tauri's standard layout). Domain tests are colocated (`*.test.ts`) so a module and its spec
sit side by side; E2E tests live in `tests/e2e`.

## Key Design Decisions (summary — details in research.md)

1. **Board = React Flow, rules = domain.** React Flow renders and reports gestures; on
   `onNodeDragStop` / `onResizeEnd` the store calls `domain/layout` to snap and commit one
   history entry. React Flow node/edge objects are derived from the domain board in
   `ui/board/adapters.ts` — the domain never sees React Flow types.
2. **Pomodoro widget is not a board node.** It lives in *window* space (doesn't zoom/pan with
   the board), is dragged with pointer events, and is clamped on window resize.
3. **Time has one source of truth: `endsAt`.** UI derives remaining time; Rust schedules the
   completion so background throttling can't delay the alert.
4. **Undo = immutable snapshots of `board` only.** Theme, pin, and timer actions are excluded
   (spec Edge Case "Undo scope"). The viewport (pan/zoom) is excluded too: applying a snapshot
   keeps the current viewport, so undo never jumps the view.
5. **Theme** = `data-theme` attribute on `<html>` + React Flow `colorMode`, both driven by
   `prefs.theme` (resolving `system` via the `SystemTheme` port).
6. **"Evenly spaced"** = 8 pt token scale + 8 px snap + 24 px board gap + guides + tidy-up.

## Phase Outline (for /speckit-tasks)

The tasks command should generate phases in this order (each story independently shippable):

| Phase | Content | Demo-able result |
|---|---|---|
| 0. Setup | Scaffold Tauri+React+TS, lint/format, Vitest, Playwright, CI, tokens & themes skeleton, ports + fakes | Empty themed window |
| 1. Foundation | `schema.ts`, `defaults.ts`, store, history, autosave, Rust storage commands | Data round-trips to disk |
| 2. US1 (P1) | estimate, tasks, rollup → SectionNode/TaskList/EstimateInput | **MVP**: one usable to-do section |
| 3. US2 (P1) | snap, guides, placement, tidy → board drag/resize, pan/zoom, delete+undo | Multi-section board |
| 4. US3 (P2) | pomodoro domain, Rust timer, widget, settings, notification | Focus timer |
| 5. US4 (P2) | ThemeToggle, system theme, contrast tests | Light/dark |
| 6. US5 (P2) | PinButton + capability | Always on top |
| 7. US6 (P3) | connections domain, ConnectionEdge, edge toolbar | Arrows/lines |
| 8. Polish | perf fixture & budget check, a11y sweep, empty states, packaging | Release candidate |

## Git Workflow

- Branch: `git switch -c 001-sections-board` from `main` (spec-kit's `create-new-feature`
  script does this for you).
- Short-lived sub-branches per story are optional for a solo project
  (`001-sections-board/us1-tasks`) — merge back into the feature branch, then PR to `main`.
- Example commits for this phase:
  - `docs(constitution): ratify v1.0.0`
  - `docs(spec): add 001 sections board specification`
  - `docs(plan): add 001 plan, research, data model and contracts`
  - then, during implementation: `test(domain): estimate parser cases` →
    `feat(domain): parse and format task estimates`

## Complexity Tracking

| Violation / added complexity | Why needed | Simpler alternative rejected because |
|---|---|---|
| Second language & project (`src-tauri`, Rust) | Native always-on-top, native notifications, least-privilege permissions, small memory footprint | Electron (single language) ships Chromium + Node (higher RAM, weaker default isolation); a pure-browser app cannot pin above other windows |
| Native timer scheduler (`timer.rs`) instead of a JS `setTimeout` | Webviews throttle background timers; completion alerts could arrive up to a minute late (violates FR-021/022, SC-005) | JS-only timer is accurate for *display* (via `endsAt`) but not for *firing the alert* while minimized |

## Post-Design Notes / Open Questions for `/speckit-clarify` (optional)

- Should "Tidy up" respect connections (e.g. place connected sections left→right)? Currently
  no — reading order only.
- Should the timer auto-start the next session? Currently no (spec Assumptions).
- macOS "always on top" doesn't float over other apps' full-screen Spaces — acceptable?

## Next Step

Run `/speckit-tasks` to generate `tasks.md` from this plan, then `/speckit-analyze` to
cross-check spec ↔ plan ↔ tasks consistency before `/speckit-implement`.
