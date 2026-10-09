---

description: "Task list for 001-sections-board: Sections Board with Pomodoro"
---

# Tasks: Sections Board with Pomodoro

**Input**: Design documents from `/specs/001-sections-board/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution II (Test-First, NON-NEGOTIABLE) mandates test-first domain logic
(≥ 90 % coverage of `src/domain/`) and at least one automated acceptance test per user story.
Within every phase, test tasks come first and MUST fail before the matching implementation task.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested and
demoed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story the task belongs to (US1 … US6)

## Path Conventions

Single repo, Tauri standard layout (see plan.md → Project Structure):

- `src/domain/` pure TS (no React, Tauri, DOM, timers, `Date.now()`; time is a `now` argument)
- `src/state/`, `src/platform/{tauri,fake}/`, `src/ui/`
- `src-tauri/` Rust shell
- `tests/e2e/` Playwright, `tests/fixtures/` JSON fixtures
- Domain/state unit tests are colocated as `*.test.ts`

## Conventions every task MUST follow

- Domain functions are pure: `(input, …args) → newValue`. Functions that create entities take the
  new id as an argument; only `src/state/` calls `newId()`.
- Only `src/platform/tauri/` may import `@tauri-apps/*`; only `src/ui/` may import `@xyflow/react`
  or `@dnd-kit/*`. React Flow ⇄ domain mapping lives only in `src/ui/board/adapters.ts`.
- Components style through CSS Modules referencing tokens from `src/ui/theme/tokens.css`. No raw hex/px.
- User text renders as text (never `dangerouslySetInnerHTML`).
- Interactive elements inside a section node carry the `nodrag` class (and the scroll area `nowheel`).
- Commits follow Conventional Commits (e.g. `test(domain): …` then `feat(domain): …`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold, tooling, CI, design-token skeleton and security config. No feature behaviour.

- [ ] T001 Scaffold a Tauri 2 + React + TypeScript app in a temporary folder **outside the repo** with `pnpm create tauri-app focusboard` (template `react-ts`, manager `pnpm`, product name `Focusboard`, identifier `app.focusboard.desktop`), then copy its files into the repo root. Never run the scaffolder inside the repo (on a non-empty folder it offers to delete existing files) and never overwrite `.specify/`, `specs/`, `.claude/` or `.gitignore` (merge it). The repo root must then include `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`. Delete template demo code (greet command, logos, `App.css`). Append `node_modules/`, `dist/`, `src-tauri/target/`, `coverage/`, `playwright-report/`, `test-results/` to `.gitignore`
- [ ] T002 Add dependencies from quickstart.md → Scaffold with exact pinned versions in `package.json` (runtime: `@xyflow/react`, `zustand`, `immer`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`, `lucide-react`, `@tauri-apps/api`, `@tauri-apps/plugin-notification`; dev: `vitest`, `@vitest/coverage-v8`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `typescript-eslint`, `prettier`, `stylelint`, `stylelint-config-standard`) and `tauri-plugin-notification`, `tauri-plugin-window-state`, `tokio` (feature `time`) in `src-tauri/Cargo.toml`; commit `pnpm-lock.yaml` and `src-tauri/Cargo.lock`
- [ ] T003 [P] Set `tsconfig.json` to `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, target ES2022
- [ ] T004 [P] Configure ESLint flat config in `eslint.config.js` (typescript-eslint `strictTypeChecked`, `@typescript-eslint/no-explicit-any: error`, `no-restricted-imports`: `src/domain/**` may not import `react`, `@tauri-apps/*`, `@xyflow/*`, `@dnd-kit/*`, `zustand`; files outside `src/platform/tauri/**` may not import `@tauri-apps/*`; files outside `src/ui/**` may not import `@xyflow/*` or `@dnd-kit/*`) and Prettier in `.prettierrc.json` (printWidth 100, singleQuote)
- [ ] T005 [P] Configure Stylelint in `.stylelintrc.json` for `src/**/*.module.css`: disallow hex colors and `px` values other than `0` and `1px` (`color-no-hex`, `declaration-property-unit-disallowed-list`), so components must use tokens (research R8)
- [ ] T006 [P] Configure Vitest in `vitest.config.ts`: `environment: 'jsdom'` for `src/ui/**`, `node` for `src/domain/**` and `src/state/**`; coverage v8 with thresholds lines/branches 90 for `src/domain/**`; add scripts `test`, `test:coverage`, `lint` (eslint + stylelint + `tsc --noEmit`) to `package.json`
- [ ] T007 [P] Configure Playwright in `playwright.config.ts`: `webServer` runs `pnpm dev` on port 1420, Chromium only, two projects `light` and `dark` (`colorScheme`), `testDir: tests/e2e`; add script `e2e` to `package.json`
- [ ] T008 [P] Create CI workflow `.github/workflows/ci.yml`: job `web` on ubuntu (pnpm install --frozen-lockfile → `pnpm lint` → `pnpm test:coverage` → `pnpm exec playwright install --with-deps chromium` → `pnpm e2e` → `pnpm audit --audit-level high`); job `rust` on ubuntu (`cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, `cargo audit`, all with `--manifest-path src-tauri/Cargo.toml`, install Tauri Linux deps first); job `build` matrix windows-latest + macos-latest running `pnpm tauri build` after `web` and `rust` pass
- [ ] T009 [P] Create design tokens in `src/ui/theme/tokens.css` exactly per research R8 table: `--space-1`…`--space-7` (4, 8, 16, 24, 32, 48, 64 px), `--board-gap: 24px`, radii (`--radius-section: 24px`, `--radius-row: 12px`, `--radius-pill: 999px`, `--radius-timer: 28px`), the six accent colors as `--accent-orange` … `--accent-sky` plus `--on-accent-*` and light-mode text variants `--accent-*-text`, type scale (incl. `--font-timer: 56px`/`64px`) with a `tabular-nums` helper class, motion durations `--motion-fast: 150ms`, `--motion-theme: 220ms`
- [ ] T010 [P] Create `src/ui/theme/themes.css` mapping semantic tokens (`--surface-board`, `--surface-card`, `--surface-raised`, `--hairline`, `--text`, `--text-muted`, `--focus-ring`, `--shadow-card`) for `[data-theme="light"]` and `[data-theme="dark"]` using the R8 surface colors, plus a `@media (prefers-reduced-motion: reduce)` block setting all motion tokens to `0ms`; create `src/ui/theme/reactflow-overrides.css` mapping React Flow's `--xy-*` CSS variables onto these tokens
- [ ] T011 [P] Bundle Inter variable font (OFL) as `src/ui/theme/fonts/InterVariable.woff2` with `@font-face` in `src/ui/theme/fonts.css`; import `tokens.css`, `themes.css`, `fonts.css`, `@xyflow/react/dist/style.css`, `reactflow-overrides.css` from `src/main.tsx`
- [ ] T012 Harden the shell in `src-tauri/tauri.conf.json` (CSP exactly `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'`, main window min size 480×360, title `Focusboard`) and `src-tauri/capabilities/default.json` granting only: `core:event:default`, `core:window:allow-set-always-on-top`, `core:window:allow-is-always-on-top`, `notification:default`. No `core:default`, `window-state:*` (the plugin runs Rust-side), `fs:*`, `shell:*`, `http:*`, `opener:*` (contracts/ipc-commands.md). Verify `pnpm tauri dev` logs no "not allowed" permission errors

**Checkpoint**: `pnpm lint`, `pnpm test`, `pnpm tauri dev` all run; an empty themed window opens.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Document schema, persistence, store, undo/redo, autosave, platform ports and the app
shell. Every user story builds on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundation (write first, watch them fail)

- [ ] T013 [P] Write `src/domain/schema.test.ts`: `emptyDocument(now)` validates; rejects zoom 0.2 / 2.1, `estimateMin` 0 / 5941 / 1.5, unknown extra properties, section width < 240, label > 40 chars, bad UUID; and generates the contract from the schema: `expect(JSON.stringify(z.toJSONSchema(AppDocumentSchema), null, 2) + '\n').toMatchFileSnapshot('../../specs/001-sections-board/contracts/app-document.schema.json')`. The first `pnpm test -u` replaces the hand-written contract with Zod's output; review that diff (same required fields, enums, bounds, `additionalProperties: false`) before committing. From then on the contract is generated, never hand-edited (research R5)
- [ ] T014 [P] Create fixtures `tests/fixtures/v1.json` (valid doc: 2 sections, 1 task with 2 subtasks, 1 connection, running timer) and `tests/fixtures/corrupt.json` (truncated JSON); write `src/domain/migrations.test.ts`: `loadDocument(json)` returns `{ ok: true, doc }` for v1, `{ ok: false, error }` for schema-invalid input and for `schemaVersion` greater than current, and runs the (empty) migration chain for v1
- [ ] T015 [P] Write `src/state/history.test.ts`: push/undo/redo of board snapshots; bounded to 100 (oldest dropped); a new push clears redo; `beginGesture()`…`endGesture()` with many intermediate updates produces exactly one undo entry; ending a gesture with no change produces none; undo/redo after a pan/zoom keeps the current `viewport` (snapshots restore everything in `board` except `viewport`)
- [ ] T016 [P] Write `src/state/autosave.test.ts` with Vitest fake timers and a fake `DocumentStore`: one save 500 ms after the last change; continuous changes still save at most 1 s after the first unsaved change; saved JSON round-trips through `loadDocument`; a rejected save is reported via the `onError` callback and retried on the next change; `flush()` saves immediately
- [ ] T017 [P] Write Rust tests in `src-tauri/src/storage.rs` (`#[cfg(test)]`, using a temp dir): missing file → `Empty`; save then load → `Ok` with same JSON; second save rotates previous file to `focusboard.json.bak`; corrupt main + valid `.bak` → `Recovered` and main renamed to `focusboard.corrupt-<epoch>.json`; payload > 10 MB → `Err`; a `.tmp` left from a crash is ignored; `quarantine: true` with a `.bak` renames main to `focusboard.corrupt-<epoch>.json`, promotes `.bak` to main and returns `Recovered`; without a `.bak` it returns `Empty`; calling it twice quarantines the promoted file too; no file is ever deleted or overwritten

### Implementation for Foundation

- [ ] T018 [P] Implement `src/domain/ids.ts`: branded types `SectionId`, `TaskId`, `ConnectionId`, `SessionId` and `newId(): string` using `crypto.randomUUID()`
- [ ] T019 Implement `src/domain/schema.ts` with Zod 4 schemas mirroring `contracts/app-document.schema.json` (all objects `.strict()`), exporting inferred types `AppDocument`, `Board`, `Section`, `Task`, `Subtask`, `Connection`, `PomodoroState`, `TimerStatus`, `Preferences`, `Accent`, and `CURRENT_SCHEMA_VERSION = 1`; give the root schema `.meta({ title: 'Focusboard AppDocument v1', description })` so the generated contract keeps its header (makes T013 pass)
- [ ] T020 Implement `src/domain/defaults.ts`: `ACCENTS` order `['orange','mint','pink','yellow','violet','sky']`, `DEFAULT_SETTINGS` (25/5/15/4/sound true), `MIN_SECTION = { width: 240, height: 160 }`, `GRID = 8`, `BOARD_GAP = 24`, `emptyDocument(now)` (no sections, viewport `{x:0,y:0,zoom:1}`, idle focus timer, `completedToday` for `now`'s local date, widget `{ x: 24, y: 24, visible: false }`, prefs `{ theme: 'system', pinned: false }`)
- [ ] T021 Implement `src/domain/migrations.ts`: `migrations: Record<number, (doc: unknown) => unknown>` (empty for v1) and `loadDocument(json: string): { ok: true; doc: AppDocument } | { ok: false; error: string }` that parses, migrates step by step to current, then validates (makes T014 pass)
- [ ] T022 [P] Copy `specs/001-sections-board/contracts/platform-ports.ts` verbatim to `src/platform/ports.ts`
- [ ] T023 [P] Implement fake adapters in `src/platform/fake/index.ts`: `DocumentStore` persisted to `localStorage` key `focusboard.json` (so reload tests work; if the URL has `?fixture=<name>`, load `/fixtures/<name>.json` once instead; a fixture that fails JSON parsing returns `recovered` with an empty doc, mimicking Rust; `load({ quarantine: true })` mirrors the Rust behaviour using a second `localStorage` key for the backup), `WindowControls` (in-memory, `refusePin` flag), `TimerScheduler` using `setTimeout` against the fake clock, controllable `Clock` (real time + offset), `SystemTheme` via `matchMedia`; expose `window.__focusboardFake = { clock: { advance(ms) }, window: { refusePin }, timer: { fireNow() } }` for Playwright. Serve `tests/fixtures/` at `/fixtures/` in dev only via a small dev-server middleware in `vite.config.ts`
- [ ] T024 Implement `src-tauri/src/storage.rs` commands `load_document` and `save_document` per contracts/ipc-commands.md (serde-tagged `LoadResult { kind: ok|recovered|empty }`, `Mutex` guarding saves, write `.tmp` → `sync_all` → rename current to `.bak` → rename `.tmp`, 10 MB limit, files in `app_data_dir()`, optional `quarantine` argument per contract) (makes T017 pass)
- [ ] T025 Register `load_document`, `save_document`, `tauri-plugin-notification` and `tauri-plugin-window-state` in `src-tauri/src/lib.rs`
- [ ] T026 Implement production adapters `src/platform/tauri/store.ts` (`invoke('load_document' | 'save_document')`), `src/platform/tauri/clock.ts` (`Date.now`), `src/platform/tauri/systemTheme.ts` (`matchMedia('(prefers-color-scheme: dark)')`), and `src/platform/tauri/index.ts` assembling a `Platform`; `window` and `timer` temporarily reuse the fake implementations until T084 (US3) and T100 (US5) replace them
- [ ] T027 Implement `src/state/history.ts`: bounded (100) undo/redo stacks of `Board` snapshots with `push`, `undo`, `redo`, `beginGesture`, `endGesture`, `canUndo`, `canRedo` (makes T015 pass)
- [ ] T028 Implement `src/state/store.ts` with Zustand + Immer: state `{ doc: AppDocument; status: 'loading'|'ready'|'error'; notice: string | null }`; actions `hydrate(doc)`, `updateBoard(recipe, { history?: boolean })` (pushes to history unless `history: false`), `beginGesture`, `endGesture`, `undo`, `redo` (apply the snapshot but keep the current `board.viewport`), `updatePomodoro(recipe)` and `updatePrefs(recipe)` (never in history, spec Edge Case "Undo scope"), `setNotice`
- [ ] T029 Implement `src/state/autosave.ts`: `startAutosave(store, documentStore, { onError })` subscribing to `doc` changes, debounced 500 ms with 1 s max wait, `flush()` on `beforeunload` (makes T016 pass)
- [ ] T030 [P] Implement `src/state/selectors.ts` skeleton exporting `useBoard`, `usePrefs`, `usePomodoro`, `useCanUndo`, `useCanRedo` (extended per story)
- [ ] T031 Implement `src/ui/app/PlatformProvider.tsx` (React context + `usePlatform()`), choosing tauri adapters when `'__TAURI_INTERNALS__' in window` else fakes, in `src/main.tsx`
- [ ] T032 Implement `src/ui/app/App.tsx` boot flow: `store.load()` → `ok` hydrate via `loadDocument`; if `loadDocument` fails the schema check, call `store.load({ quarantine: true })` and validate again, repeating until a document validates or the result is `empty` (no damaged file is ever overwritten); `recovered` hydrate + notice "Your board was restored from a backup.", `empty` hydrate `emptyDocument(now)` (with a notice if anything was quarantined), rejection → blocking `<dialog>` with "Start fresh" (hydrate empty doc; damaged files are kept by Rust) and the data-folder path shown as selectable text (no opener permission, see Constitution VI); then start autosave; set `document.documentElement.dataset.theme` from `prefs.theme` resolved through `SystemTheme` (`system` → OS value, live-updating)
- [ ] T033 [P] Implement `src/ui/app/Notice.tsx`: polite `aria-live` toast for `store.notice`, auto-dismiss after 5 s, styled with tokens
- [ ] T034 Implement `src/ui/toolbar/Toolbar.tsx` + `Toolbar.module.css` (fixed top bar, `--space-*` gaps, `role="toolbar"`, roving focus with arrow keys) containing Undo (`Undo2`) and Redo (`Redo2`) icon buttons with accessible names and disabled state, and `src/ui/app/shortcuts.ts` binding Ctrl/Cmd+Z → undo, Ctrl/Cmd+Shift+Z and Ctrl+Y → redo (ignored while focus is in a text input, so native text undo still works)
- [ ] T035 [P] Create Playwright helpers in `tests/e2e/helpers.ts`: `openApp(page, { fixture?, theme? })` (clears `localStorage` unless reopening), `reopenApp(page)` (reload preserving storage), `advanceClock(page, ms)`, `refusePin(page)`

**Checkpoint**: The app boots, saves an (empty) document to disk via Rust, survives a corrupt file,
and undo/redo plumbing exists. User stories can now begin.

---

## Phase 3: User Story 1 — Capture tasks in a section (Priority: P1) 🎯 MVP

**Goal**: Create a section with a title, tasks, one level of subtasks, estimates, roll-ups,
completion and reordering, all persisted.

**Independent Test**: On an empty board create one section, title it, add three tasks (one with two
subtasks), enter estimates, tick one task, reload, and verify everything is exactly as left
(spec US1 Independent Test; quickstart Manual validation 1).

### Tests for User Story 1 (write first, watch them fail) ⚠️

- [ ] T036 [P] [US1] Write `src/domain/estimate.test.ts`: `parseEstimate` accepts `25m`→25, `1h`→60, `1h 30m`/`1h30m`→90, `1.5h`→90, `90`→90, `2 hrs`→120, `45 min`→45, `1HR 5M`→65 (case/whitespace-insensitive); `''` and `0` → `{ ok: true, value: null }`; rejects `abc`, `-5`, `5941`, `100h`, `1.5m` with `{ ok: false, message }`; `formatEstimate` 25→`25m`, 60→`1h`, 90→`1h 30m`; fast-check property `parseEstimate(formatEstimate(m)).value === m` for m in 1…5940
- [ ] T037 [P] [US1] Write `src/domain/tasks.test.ts`: `addTask(section, id, text, afterIndex?)`; `editTaskText` (clamped to 500 chars); `setEstimate`; `deleteItem` removes a task with its subtasks or a single subtask; `indent(taskId)` makes it the last subtask of the task directly above (no-op for the first task and for a task that has subtasks, since FR-011 allows one level only); `outdent(subtaskId)` makes it a task directly after its parent; `moveItem(id, toIndex)` reorders within its list; completion rules per data-model "Task completion": toggling a parent sets every subtask to the same value; toggling a subtask recomputes the parent; fast-check property: after any sequence of operations, every task with subtasks has `done === subtasks.every(s => s.done)`
- [ ] T038 [P] [US1] Write `src/domain/rollup.test.ts`: `taskEstimate`, `remainingEstimate`, `sectionRemaining`, `sectionProgress` per data-model "Derived values" (leaf counting, null estimates count as 0, parent's own `estimateMin` ignored while it has subtasks and reappears after all subtasks are deleted)
- [ ] T039 [P] [US1] Write `src/domain/sections.test.ts` (creation part): `createSection(board, { id, x, y, now })` adds a 320×240 section with empty title, no tasks, accent = next in `ACCENTS` cycle based on section count, appended last (top of z-order); `renameSection` trims and clamps to 120 chars
- [ ] T040 [P] [US1] Write `src/ui/section/EstimateInput.test.tsx` (RTL + user-event): shows formatted value; typing `1.5h` + blur commits 90 and re-displays `1h 30m`; typing `abc` + blur shows `aria-invalid="true"` and a short message via `aria-describedby`, and restores the previous valid value on the next blur/Escape
- [ ] T041 [P] [US1] Write `src/ui/section/TaskList.test.tsx`: Enter in a task row adds a task below and focuses it; ten tasks can be added with the keyboard only (SC-002); Tab/Shift+Tab indent/outdent; Alt+↑/↓ reorders; checkbox toggles with Space; Delete on an empty row (or the row's delete button) removes the item; rendered text containing `<b>` appears literally
- [ ] T042 [US1] Write `tests/e2e/us1-tasks.spec.ts` covering spec US1 acceptance scenarios 1–10 and the Independent Test, including undo of a deleted task (Ctrl+Z) and `reopenApp` persistence, using the "Calculus 2" walkthrough from quickstart.md (parent shows `1h 15m`; after ticking "Ratio test" header shows `45m` remaining and progress 1/2)

### Implementation for User Story 1

- [ ] T043 [P] [US1] Implement `src/domain/estimate.ts` (`parseEstimate`, `formatEstimate`, `MAX_ESTIMATE_MIN = 5940`) per data-model "Estimate input grammar" (makes T036 pass)
- [ ] T044 [P] [US1] Implement `src/domain/tasks.ts` operating on a `Section` (makes T037 pass)
- [ ] T045 [P] [US1] Implement `src/domain/rollup.ts` (makes T038 pass)
- [ ] T046 [P] [US1] Implement `createSection` and `renameSection` in `src/domain/sections.ts` (makes T039 pass). For now `createSection` callers place it at the snapped viewport centre; US2 swaps in free-spot placement
- [ ] T047 [US1] Add store actions in `src/state/store.ts` wrapping T044/T046 (`addSection`, `renameSection`, `addTask`, `editTask`, `setEstimate`, `toggleDone`, `indent`, `outdent`, `moveItem`, `deleteItem`), each one history entry; text edits commit on blur/Enter (not per keystroke)
- [ ] T048 [P] [US1] Add selectors `useSection(id)`, `useSectionRemaining(id)`, `useSectionProgress(id)`, `useTaskEstimate(sectionId, taskId)` in `src/state/selectors.ts`
- [ ] T049 [US1] Implement `src/ui/board/adapters.ts` (`toNodes(board): Node<SectionNodeData>[]` with `type: 'section'`, position, `width`/`height`, `zIndex` from array order) and `src/ui/board/BoardCanvas.tsx` rendering `<ReactFlow>` with `nodeTypes={{ section: SectionNode }}`, `<Background>` 8 px grid, `colorMode` bound to the resolved theme, `proOptions={{ hideAttribution: true }}`, node dragging disabled until US2
- [ ] T050 [P] [US1] Implement `src/ui/section/SegmentedProgress.tsx` + `.module.css` (segmented bar, `role="progressbar"` with `aria-valuenow/min/max`, accent-colored filled segments, max 20 segments then proportional)
- [ ] T051 [P] [US1] Implement `src/ui/section/EstimateInput.tsx` + `.module.css` (`nodrag`, tabular numerals, validation per T040) (makes T040 pass)
- [ ] T052 [US1] Implement `src/ui/section/TaskRow.tsx` + `.module.css`: drag handle, checkbox (accent color), editable text (wraps, never overflows), `EstimateInput` (read-only sum when the task has subtasks), subtask indentation `--space-6`, done = strikethrough + `--text-muted`, delete button, keyboard bindings from T041
- [ ] T053 [US1] Implement `src/ui/section/TaskList.tsx` with `@dnd-kit/sortable` (keyboard sensor + pointer sensor, drag handles `nodrag`), subtasks as nested sortable list, trailing "Add a task" row, scroll container `nowheel` (makes T041 pass)
- [ ] T054 [US1] Implement `src/ui/section/SectionHeader.tsx` + `.module.css`: title input (placeholder "Untitled section", auto-focused on creation, `nodrag`), remaining total in large bold numerals (`1h` large, `30m` small), `SegmentedProgress`, sticky at top while list scrolls
- [ ] T055 [US1] Implement `src/ui/board/SectionNode.tsx` + `.module.css`: rounded card (`--radius-section`, `--surface-card`, `--shadow-card`, accent via `data-accent`), header + `TaskList`, `role="group"` with `aria-label` = title
- [ ] T056 [US1] Add "New section" (`Plus`) button to `src/ui/toolbar/Toolbar.tsx` and board empty state in `src/ui/board/EmptyBoard.tsx` (short friendly hint + "New section" button), mount `BoardCanvas` + `Toolbar` in `src/ui/app/App.tsx` (makes T042 pass)

**Checkpoint**: MVP. One or more sections work as a full to-do list and persist across restarts.

---

## Phase 4: User Story 2 — Arrange sections freely on the board (Priority: P1)

**Goal**: Drag, resize, snap, alignment guides, free-spot placement, Tidy up, pan/zoom/Fit all,
delete with confirm + undo, accent picker.

**Independent Test**: Create four sections, drag into a 2×2 layout, resize one, pan and zoom,
reload; positions, sizes and 24 px gaps are preserved (spec US2; quickstart Manual validation 2).

### Tests for User Story 2 (write first, watch them fail) ⚠️

- [ ] T057 [P] [US2] Write `src/domain/layout/snap.test.ts`: `snap(v, 8)` rounds to nearest multiple (incl. negatives and .5 cases); `snapRect` snaps x/y/width/height and enforces min 240×160
- [ ] T058 [P] [US2] Write `src/domain/layout/guides.test.ts`: `findGuides(moving, others, thresholdBoardUnits)` returns snapped position + guide lines for left/center/right and top/middle/bottom alignment and for `right + 24` / `left − 24` (and y equivalents); nothing within threshold → no snap; closest candidate wins per axis
- [ ] T059 [P] [US2] Write `src/domain/layout/placement.test.ts`: `findFreeSpot(sections, size, viewportRect)` returns a grid-aligned rect inside the viewport when possible; fast-check property: the result, inflated by 24, never intersects any existing section; empty board → snapped viewport centre
- [ ] T060 [P] [US2] Write `src/domain/layout/tidy.test.ts`: fast-check properties for `tidy(sections, rowWidthTarget)`: sizes unchanged, no overlaps, horizontally adjacent cards in a row are exactly 24 apart, consecutive rows exactly 24 apart (row height = tallest), output order equals the row-band order defined in data-model "Tidy-up" (bands by `y` within 80 px, then `x`, ties by `createdAt`); plus example tests: two sections with `y` 0 and 72 share a band (ordered by `x`), `y` 0 and 88 do not (SC-006)
- [ ] T061 [P] [US2] Extend `src/domain/sections.test.ts`: `moveSection`, `resizeSection` (clamped to min), `recolorSection`, `bringToFront` (moves to end of array), `deleteSection` removes the section and every connection touching it
- [ ] T062 [US2] Write `tests/e2e/us2-board.spec.ts` covering spec US2 scenarios 1–9: drag snaps to 8 px (assert stored x/y multiples of 8), Alt-drag skips snap, resize respects min size, header stays visible while list scrolls, new section never overlaps, Tidy up → equal gaps then Ctrl+Z restores, Fit all shows all nodes, delete non-empty section asks confirmation and undo restores it, accent change persists across reload

### Implementation for User Story 2

- [ ] T063 [P] [US2] Implement `src/domain/layout/snap.ts` (makes T057 pass)
- [ ] T064 [P] [US2] Implement `src/domain/layout/guides.ts` (makes T058 pass)
- [ ] T065 [P] [US2] Implement `src/domain/layout/placement.ts`: outward spiral over 8 px grid from viewport centre, first rect (inflated by 24) with no intersection wins; fallback to right of the right-most section (makes T059 pass)
- [ ] T066 [P] [US2] Implement `src/domain/layout/tidy.ts` (makes T060 pass)
- [ ] T067 [US2] Add `moveSection`, `resizeSection`, `recolorSection`, `bringToFront`, `deleteSection` to `src/domain/sections.ts` (makes T061 pass; `deleteSection` needs `board.connections`, so it takes `Board`)
- [ ] T068 [US2] Add store actions in `src/state/store.ts`: drag/resize use `beginGesture` on start and one `endGesture` commit on stop with snapped values; `setViewport` with `history: false`; `tidyUp(viewportWidth)`; `deleteSection`; `recolorSection`; `addSection` now uses `findFreeSpot` with the current viewport
- [ ] T069 [US2] Enable dragging in `src/ui/board/BoardCanvas.tsx`: drag handle = section header (`dragHandle` selector), `onNodeDragStart` → `bringToFront` + begin gesture, `onNodeDrag` → compute guides (skip when Alt held), `onNodeDragStop` → commit snapped position (raw when Alt held); keyboard move of a selected section with arrow keys (8 px, Shift = 24 px)
- [ ] T070 [P] [US2] Implement `src/ui/board/AlignmentGuides.tsx` rendering active guide lines in a React Flow `<ViewportPortal>` (hairline, accent color)
- [ ] T071 [US2] Add `<NodeResizer minWidth={240} minHeight={160}>` to `src/ui/board/SectionNode.tsx`, committing snapped size on `onResizeEnd` as one history entry
- [ ] T072 [US2] Keyboard resize in `src/ui/board/BoardCanvas.tsx`: Ctrl+Arrow grows/shrinks the selected section by 8 px (Ctrl+Shift+Arrow = 24 px), clamped to 240×160; consecutive presses form one gesture (one history entry); add the case to `tests/e2e/us2-board.spec.ts` (Constitution IV keyboard parity)
- [ ] T073 [US2] Configure pan/zoom in `src/ui/board/BoardCanvas.tsx`: `minZoom 0.25`, `maxZoom 2`, pan with space+drag, middle-drag and trackpad (`panOnScroll`, `panActivationKeyCode="Space"`), Ctrl/Cmd+scroll zoom, restore `defaultViewport` from `board.viewport`, `onMoveEnd` → `setViewport`; implement `src/ui/board/ZoomControls.tsx` (zoom in/out, percentage, "Fit all") with accessible names
- [ ] T074 [P] [US2] Implement `src/ui/section/AccentPicker.tsx` + `.module.css` (radio group of the six accents, labelled by color name, visible focus) opened from a section header menu
- [ ] T075 [US2] Implement section delete: header menu "Delete section" → `src/ui/section/ConfirmDeleteDialog.tsx` (native `<dialog>`, focus trapped, Escape cancels) when the section has tasks, else delete immediately; Delete key on a selected section does the same
- [ ] T076 [US2] Add "Tidy up" (`LayoutGrid`) button to `src/ui/toolbar/Toolbar.tsx` (makes T062 pass)

**Checkpoint**: US1 + US2 give a complete multi-section board.

---

## Phase 5: User Story 3 — Focus with a movable Pomodoro timer (Priority: P2)

**Goal**: Draggable window-space Pomodoro widget, accurate in the background, with native
completion notifications and restart recovery.

**Independent Test**: Start a focus session, drag the widget, background the app for minutes,
return: remaining time correct; at zero an alert fires and the widget shows the break, idle
(spec US3; quickstart Manual validation 3).

### Tests for User Story 3 (write first, watch them fail) ⚠️

- [ ] T077 [P] [US3] Write `src/domain/pomodoro.test.ts` covering data-model "Pomodoro state machine": `start(p, now, sessionId)` sets `endsAt = now + duration`; `pause` freezes `remainingMs` exactly; a paused timer never completes regardless of `now`; `resume` sets `endsAt = now + remainingMs`; `reset` → idle same mode; `complete` from focus increments `focusStreak` and `completedToday.count` and goes to shortBreak, or longBreak every `longBreakEvery`th focus (then resets streak); `skip` advances without counting; break → focus; always lands idle (no auto-start); `remainingMs(p, now)` never negative; `reconcile(p, now)` completes a running session whose `endsAt ≤ now` (load and clock-jump cases); `completedToday` resets when `now` is a new local date; `updateSettings` mid-session does not change the running `endsAt`
- [ ] T078 [P] [US3] Write Rust tests in `src-tauri/src/timer.rs` (`#[cfg(test)]`, `tokio::test` with paused time): scheduling fires once at `endsAtMs`; past `endsAtMs` fires immediately; a new schedule cancels the previous; `cancel` with a non-matching `sessionId` is a no-op; `cancel` with the matching one prevents firing (scheduler core written against an injectable `now`/`notify` so it is testable without a Tauri app)
- [ ] T079 [P] [US3] Write `src/ui/pomodoro/PomodoroWidget.test.tsx`: shows mode label and `25:00` in idle; Start/Pause/Resume/Reset/Skip buttons appear per state with accessible names; dragging by the widget handle moves it; position is clamped inside the window when dropped partly off-screen or when the window shrinks; "Focusing on …" shows when a task is linked; arrow keys on the focused drag handle move the widget 8 px (Shift = 24 px), clamped to the window
- [ ] T080 [US3] Write `tests/e2e/us3-pomodoro.spec.ts` with the fake clock: scenarios 1–8 (toggle visible, start/pause/resume/reset/skip, drag persists across reload, `advanceClock` 25 min → in-app alert + short break idle + count 1, 4th focus → long break, settings change applies next session, linked task name shown, reload while running restores remaining time or completed state)

### Implementation for User Story 3

- [ ] T081 [US3] Implement `src/domain/pomodoro.ts` (`durationOf`, `start`, `pause`, `resume`, `reset`, `skip`, `complete`, `reconcile`, `remainingMs`, `updateSettings`, `localDateKey(now)`) (makes T077 pass)
- [ ] T082 [US3] Implement `src-tauri/src/timer.rs`: commands `schedule_timer_completion` and `cancel_timer_completion` per contracts/ipc-commands.md; a single `Mutex<Option<(SessionId, JoinHandle)>>`; the task sleeps in chunks of at most 30 s and re-checks wall clock (`SystemTime`) to survive system sleep, then sends the notification via `tauri-plugin-notification` and emits `pomodoro://completed { sessionId, firedAtMs }` (makes T078 pass)
- [ ] T083 [US3] Register the two timer commands in `src-tauri/src/lib.rs`
- [ ] T084 [P] [US3] Implement `src/platform/tauri/timer.ts` (`invoke` schedule/cancel, `listen('pomodoro://completed')`, notification permission request on first schedule via `@tauri-apps/plugin-notification`) and replace the fake timer in `src/platform/tauri/index.ts`
- [ ] T085 [US3] Add pomodoro store actions in `src/state/store.ts` (`timerStart`, `timerPause`, `timerResume`, `timerReset`, `timerSkip`, `timerComplete`, `setTimerSettings`, `setWidgetPosition`, `setWidgetVisible`, `linkTask`) via `updatePomodoro` (never history); start/resume call `platform.timer.schedule` with title/body text for the next mode, pause/reset/skip call `cancel`; `onCompleted` applies `complete` only when `sessionId` matches
- [ ] T086 [US3] On boot in `src/ui/app/App.tsx` apply `reconcile(pomodoro, now)` and re-schedule a still-running session; on `visibilitychange` → visible, reconcile again (clock jumps)
- [ ] T087 [US3] Clear `pomodoro.linkedTaskId` when the linked task (or its section) is deleted, inside the store's delete actions in `src/state/store.ts`
- [ ] T088 [US3] Implement `src/ui/pomodoro/PomodoroWidget.tsx` + `.module.css`: fixed-position window-space overlay above the board (`--radius-timer`), pointer-event drag on a handle plus arrow-key moves on the focused handle (8 px, Shift = 24 px), clamp to window on drop and on `resize`, large tabular numerals (`--font-timer`), mode label, segmented progress, today's completed count (FR-024), linked task name, controls; re-render every 250 ms only while running and the document is visible; `aria-live="polite"` announcing only mode changes, not each second (makes T079 pass)
- [ ] T089 [P] [US3] Implement `src/ui/pomodoro/PomodoroSettings.tsx` (popover form: focus 1–120, short 1–60, long 1–90, long-break-every 2–10, sound toggle; invalid input keeps previous value)
- [ ] T090 [US3] Implement completion feedback in `src/ui/pomodoro/useCompletionAlert.ts`: on completion show an in-app alert (always when notification permission is denied), play bundled `src/ui/pomodoro/chime.ogg` via `HTMLAudioElement` when `settings.sound`
- [ ] T091 [US3] Add timer toggle (`Timer` icon) to `src/ui/toolbar/Toolbar.tsx` and a "Focus on this" action in `src/ui/section/TaskRow.tsx` menu that links the task and shows the widget (makes T080 pass)

**Checkpoint**: The timer works on its own and alongside US1/US2.

---

## Phase 6: User Story 4 — Switch between light and dark mode (Priority: P2)

**Goal**: Sun/moon toggle that switches the whole UI instantly, follows the OS until chosen,
persists, and passes WCAG 2.2 AA in both themes.

**Independent Test**: Click moon: everything is dark; click sun: light; reload: choice kept
(spec US4; quickstart Manual validation 4).

### Tests for User Story 4 (write first, watch them fail) ⚠️

- [ ] T092 [P] [US4] Write `src/ui/theme/contrast.test.ts`: parse `tokens.css`/`themes.css` and assert WCAG contrast ≥ 4.5:1 for `--text`/`--text-muted` on every surface and every `--accent-*-text` on `--surface-card`, ≥ 3:1 for `--focus-ring`, `--hairline`-bordered controls and each `--on-accent-*` on its accent, in both themes (Constitution IV, FR-027)
- [ ] T093 [P] [US4] Write `src/ui/toolbar/ThemeToggle.test.tsx`: two buttons labelled "Light mode" and "Dark mode", the active one has `aria-pressed="true"`; with `prefs.theme = 'system'` the OS value is shown as active; clicking sets `prefs.theme` and is not added to undo history
- [ ] T094 [US4] Write `tests/e2e/us4-theme.spec.ts` (scenarios 1–4 incl. first launch following `colorScheme` and persistence across reload, no state lost on switch) and `tests/e2e/themes.visual.spec.ts` (screenshot of the `v1` fixture board in each theme)

### Implementation for User Story 4

- [ ] T095 [US4] Implement `src/ui/toolbar/ThemeToggle.tsx` + `.module.css` (`Sun`/`Moon` icons in a segmented pill, `aria-pressed`) and add it to `src/ui/toolbar/Toolbar.tsx`; action `setTheme` via `updatePrefs` (makes T093 pass)
- [ ] T096 [US4] Theme cross-fade: transition `background-color`/`color` with `--motion-theme` on themed surfaces in `src/ui/theme/themes.css` (0 ms under reduced motion); ensure `BoardCanvas` `colorMode`, dialogs, `PomodoroWidget` and alignment guides all read semantic tokens
- [ ] T097 [US4] Adjust any token values in `src/ui/theme/tokens.css` / `themes.css` that fail T092 (e.g. yellow text `#8A6D00` in light mode) until T092 and T094 pass

**Checkpoint**: Both themes complete and accessible.

---

## Phase 7: User Story 5 — Keep the app on top (Priority: P2)

**Goal**: Pin button toggles always-on-top, reflects the OS result, restores on restart.

**Independent Test**: Pin, click another app: Focusboard stays above; unpin: normal stacking
(spec US5; quickstart Manual validation 5, manual on the native shell).

### Tests for User Story 5 (write first, watch them fail) ⚠️

- [ ] T098 [P] [US5] Write `src/ui/toolbar/PinButton.test.tsx` with fake `WindowControls`: click → `setPinned(true)` resolves true → `aria-pressed="true"` and tooltip/name "Unpin from top"; click again → unpinned, name "Pin on top"; when `setPinned` resolves false or rejects → stays unpressed and notice "Couldn't keep the window on top." appears; not added to undo history
- [ ] T099 [US5] Write `tests/e2e/us5-pin.spec.ts` (fake adapter): scenarios 1–4 incl. `refusePin` and pinned state restored after `reopenApp`

### Implementation for User Story 5

- [ ] T100 [P] [US5] Implement `src/platform/tauri/window.ts` (`getCurrentWindow().setAlwaysOnTop(p)` then return `isAlwaysOnTop()`; return `false` on rejection) and replace the fake window adapter in `src/platform/tauri/index.ts`
- [ ] T101 [US5] Implement `src/ui/toolbar/PinButton.tsx` (`Pin`/`PinOff` icons, `aria-pressed`, `title`) and add it to `src/ui/toolbar/Toolbar.tsx`; action `setPinned` in `src/state/store.ts` updates `prefs.pinned` only to the value the OS applied (makes T098 pass)
- [ ] T102 [US5] On boot in `src/ui/app/App.tsx`, if `prefs.pinned` call `platform.window.setPinned(true)` and store the applied result (makes T099 pass)

**Checkpoint**: Pin works; verify manually on Windows and macOS (note the macOS full-screen Spaces limitation from research R7).

---

## Phase 8: User Story 6 — Connect sections with arrows or lines (Priority: P3)

**Goal**: Draw arrow/line connections between sections that follow moves, can be restyled,
reversed, labelled and deleted.

**Independent Test**: Connect two sections, move one (arrow follows), switch to line, add label,
delete (spec US6; quickstart Manual validation 6). Requires US1 and US2.

### Tests for User Story 6 (write first, watch them fail) ⚠️

- [ ] T103 [P] [US6] Write `src/domain/connections.test.ts`: `connect(board, { id, from, to })` creates an `arrow` with empty label; rejects `from === to` and duplicates with the same `(from, to)` (opposite direction is allowed); `canConnect` mirrors those rules; `restyle`; `reverse` (rejected if it would duplicate); `setLabel` clamps to 40 chars; `removeConnection`; every result keeps from/to referencing existing sections
- [ ] T104 [P] [US6] Write `src/ui/board/edgeGeometry.test.ts`: `attachPoints(fromRect, toRect)` returns points on each rectangle's border along the centre-to-centre line, for left/right/above/below and overlapping cases
- [ ] T105 [US6] Write `tests/e2e/us6-connections.spec.ts`: scenarios 1–5 (drag from edge handle creates arrow, follows a moved/resized section, toolbar switch to line / reverse / label "then" / delete, self and duplicate rejected, delete section removes its connections and undo restores both, and a connection created with the keyboard only via "Connect to…")

### Implementation for User Story 6

- [ ] T106 [P] [US6] Implement `src/domain/connections.ts` (makes T103 pass)
- [ ] T107 [P] [US6] Implement `src/ui/board/edgeGeometry.ts` (makes T104 pass)
- [ ] T108 [US6] Add store actions `connect`, `restyleConnection`, `reverseConnection`, `labelConnection`, `removeConnection` (one history entry each) in `src/state/store.ts`
- [ ] T109 [US6] Extend `src/ui/board/adapters.ts` with `toEdges(board)` (`type: 'connection'`, `markerEnd` arrow only for `style: 'arrow'`) and add four connection `<Handle>`s (one per side, visible on hover/focus, keyboard focusable) to `src/ui/board/SectionNode.tsx`; wire `onConnect` + `isValidConnection` (uses `canConnect`) in `src/ui/board/BoardCanvas.tsx` with `connectionMode="loose"`
- [ ] T110 [US6] Implement `src/ui/board/ConnectionEdge.tsx`: floating edge using `edgeGeometry.attachPoints` from live node rects, `--text-muted` stroke (selected → accent), label via `<EdgeLabelRenderer>` rendered as text
- [ ] T111 [US6] Implement `src/ui/board/EdgeToolbar.tsx` (shown for the selected edge: Arrow/Line toggle, Reverse, label input max 40, Delete; Delete/Backspace key removes the selected edge)
- [ ] T112 [US6] Implement "Connect to…" in the section header menu as `src/ui/section/ConnectMenu.tsx`: lists other sections by title, entries where `canConnect` is false are disabled, choosing one calls `connect` (keyboard path for Constitution IV) (makes T105 pass)

**Checkpoint**: All six user stories work independently and together.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Budgets, accessibility sweep, edge cases, packaging.

- [ ] T113 [P] Write `tests/e2e/a11y.spec.ts`: `@axe-core/playwright` (WCAG 2.2 AA tags) on empty board, populated board, open dialogs, timer settings, edge toolbar, in both themes; plus a keyboard-only pass that reaches and operates every toolbar control, creates a section, adds tasks, starts the timer and connects two sections (SC-007)
- [ ] T114 [P] Create `tests/fixtures/large-board-50x100.json` (50 sections × 10 tasks, 100 connections) with a generator script `scripts/make-large-fixture.mjs`, and add a cross-platform `dev:fixture` script to `package.json` that opens `pnpm dev` at `/?fixture=<name>`
- [ ] T115 Write `tests/e2e/perf.spec.ts`: load the large fixture, drag a section for 3 s while sampling `requestAnimationFrame` deltas; fail if the median frame time > 16.7 ms or the p95 > 33 ms (rough CI version of Constitution V; full check is manual per quickstart)
- [ ] T116 Measure Constitution V release gates on the Windows release build with the large fixture: cold start (launch → board visible; add `performance.mark('board-ready')` after the first board render in `src/ui/app/App.tsx`) and idle memory after 60 s idle (Task Manager, all Focusboard + WebView2 processes); record both in `specs/001-sections-board/checklists/release.md`. Release is blocked if cold start ≥ 2 s or idle memory ≥ 250 MB (SC-004)
- [ ] T117 Fix any performance issues found by T115 (memoize `SectionNode`/`TaskRow`, stable selectors, avoid re-deriving all nodes on unrelated store updates in `src/ui/board/adapters.ts`)
- [ ] T118 [P] Tiny-window edge case: collapse less-used toolbar buttons into an overflow menu below 640 px width in `src/ui/toolbar/Toolbar.tsx`; verify the timer is re-clamped on window resize
- [ ] T119 [P] Long-text edge case: titles and task text wrap (`overflow-wrap: anywhere`) inside the card radius in `src/ui/section/SectionHeader.module.css` and `src/ui/section/TaskRow.module.css`; add a case to `tests/e2e/us1-tasks.spec.ts`
- [ ] T120 [P] Reduced motion: verify every transition/animation uses motion tokens (no literal durations) and add an assertion with `reducedMotion: 'reduce'` in `tests/e2e/a11y.spec.ts`
- [ ] T121 [P] Recovery edge case: e2e in `tests/e2e/us1-tasks.spec.ts` that opens `?fixture=corrupt` and asserts the backup notice from T032 is shown
- [ ] T122 Packaging: app icons via `pnpm tauri icon` from a 1024 px source into `src-tauri/icons/`, bundle metadata (version 0.1.0, category Productivity) in `src-tauri/tauri.conf.json`; run `pnpm tauri build` on Windows
- [ ] T123 [P] Write `README.md`: what Focusboard is, prerequisites, `pnpm tauri dev` / `pnpm dev` / tests, data location, link to `specs/001-sections-board/`
- [ ] T124 Run `pnpm audit --audit-level high` and `cargo audit`; resolve high-severity findings (Constitution VI)
- [ ] T125 Run the full quickstart.md manual validation (all 6 stories + performance check) on the native Windows build; record results and follow-ups in `specs/001-sections-board/checklists/release.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1 (needs sections to exist and render)
- **US3 (Phase 5)**: depends on Foundational only; scenario 7 ("link to task"), T087 and T091's task-row action need US1
- **US4 (Phase 6)**: depends on Foundational only (theme plumbing is in T032); the visual test T094 is most useful after US1–US3
- **US5 (Phase 7)**: depends on Foundational only
- **US6 (Phase 8)**: depends on US1 and US2 (connections attach to sections and must follow moves)
- **Polish (Phase 9)**: depends on all stories

### Story graph

```text
Setup → Foundational ─┬─ US1 ─── US2 ─── US6
                      ├─ US3 (task link needs US1)
                      ├─ US4
                      └─ US5
                                    all ─→ Polish
```

### Within each story

- Test tasks first; run them and confirm they fail (Red) before the matching implementation task.
- Domain → store actions → UI components → toolbar wiring → e2e green.
- Commit `test(...)` and `feat(...)` together or test first (Constitution, Development Workflow).

### Parallel Opportunities

- Setup: T003–T011 all [P] after T001–T002.
- Foundational: tests T013–T017 in parallel; then T018, T022, T023, T030 in parallel; Rust T024–T025 alongside the TS state work T027–T029.
- After Foundational: US3, US4 and US5 can proceed in parallel with US1 → US2 → US6.
- Inside a story, every `[P]` domain test and its `[P]` domain implementation touch distinct files.

---

## Parallel Example: User Story 1

```bash
# Red: all US1 unit/component tests together
Task: "T036 estimate tests in src/domain/estimate.test.ts"
Task: "T037 task operation tests in src/domain/tasks.test.ts"
Task: "T038 roll-up tests in src/domain/rollup.test.ts"
Task: "T039 section creation tests in src/domain/sections.test.ts"
Task: "T040 EstimateInput tests in src/ui/section/EstimateInput.test.tsx"
Task: "T041 TaskList keyboard tests in src/ui/section/TaskList.test.tsx"

# Green: domain modules together
Task: "T043 src/domain/estimate.ts"
Task: "T044 src/domain/tasks.ts"
Task: "T045 src/domain/rollup.ts"
Task: "T046 src/domain/sections.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T057 snap tests"      Task: "T058 guides tests"
Task: "T059 placement tests" Task: "T060 tidy tests"
# then
Task: "T063 snap.ts"  Task: "T064 guides.ts"  Task: "T065 placement.ts"  Task: "T066 tidy.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T077 pomodoro domain tests"  Task: "T078 timer.rs tests"  Task: "T079 widget tests"
# then T081 (TS) and T082 (Rust) can be built side by side
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1
3. **STOP and VALIDATE**: `pnpm test`, `pnpm e2e --grep us1`, quickstart step 1 in `pnpm tauri dev`
4. Merge-ready demo: a persistent to-do section with estimates

### Incremental Delivery

1. Setup + Foundational → data round-trips to disk
2. + US1 → MVP to-do section
3. + US2 → free-form multi-section board
4. + US3 → focus timer
5. + US4 → light/dark
6. + US5 → always on top
7. + US6 → arrows/lines
8. Polish → release candidate

Each step leaves `main`-mergeable, fully tested software.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- The load-error dialog shows the data-folder path as text instead of an "Open data folder"
  button, because the `opener` permission is not granted (Constitution VI; contract updated).
- Decision made here: indenting a task that already has subtasks is a no-op (keeps FR-011's
  one-level rule simple).
- Verify tests fail before implementing; stop at any checkpoint to validate a story on its own.
