<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: Principle V materially changed — the idle-memory budget gains a stress-board
  tier (< 350 MB for boards of 50+ sections) and gates on the median of 3 runs.
  Measured 2026-10-11: the WebView2 floor is ~130 MB on an empty board; the 50-section,
  500-task stress board idles at 270–309 MB after removing per-card GPU scroll layers,
  with ~30 MB run-to-run swing. Ordinary boards stay under 250 MB.
Principles modified:
  V.   Responsive by Budget — idle memory tiers, median-of-3 measurement
Sections added: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md   — no change required (gates still map 1:1)
  ✅ .specify/templates/spec-template.md   — no change required
  ✅ .specify/templates/tasks-template.md  — no change required
Follow-up TODOs: none
-->

# Focusboard Constitution

> *Focusboard* is a working title for a local-first desktop whiteboard of to-do
> sections, connections, and a Pomodoro timer. Rename freely; the principles stand.

## Core Principles

### I. Local-First & Private

- All user data (board, sections, tasks, connections, timer settings, preferences) MUST
  be stored on the user's machine. The app MUST be fully functional with no network.
- The app MUST NOT send telemetry, analytics, or user content anywhere without an
  explicit, opt-in feature that has its own spec.
- Persisted data MUST be written atomically (write-temp → fsync → rename) so a crash or
  power loss never leaves a half-written board file. The previous good file is kept as
  a single rolling backup.
- Every persisted document MUST carry a `schemaVersion`. Loading an older version MUST
  run a tested migration — never a silent best-effort parse.

**Rationale:** A productivity tool that loses tasks or leaks them destroys trust faster
than any missing feature.

### II. Test-First (NON-NEGOTIABLE)

- Domain logic (task-tree operations, estimate roll-ups, the Pomodoro state machine,
  grid-snapping/spacing math, serialization and migrations) MUST be written test-first:
  write the test → watch it fail → implement → refactor (Red-Green-Refactor).
- Every user story in a spec MUST have at least one automated acceptance test
  (component or end-to-end) that maps to its Given/When/Then scenarios.
- Bug fixes MUST start with a failing regression test that reproduces the bug.
- Coverage target for the `domain/` layer: ≥ 90 % lines and branches. UI layers are
  measured by acceptance tests, not by a coverage percentage.

**Rationale:** Interactive canvases are hard to debug by eye; pure, tested logic keeps
the hard parts provable.

### III. Layered Architecture (Domain ⟂ UI ⟂ Platform)

- Code MUST be organized into layers with one-way dependencies:
  `ui → state (application) → domain`, with `platform` adapters injected at the edge.
- `domain/` MUST be pure TypeScript: no React, no Tauri, no DOM, no timers, no I/O.
  Time is passed in (`now: number`), never read from a global clock.
- Platform capabilities (window pinning, persistence, notifications) MUST sit behind
  interfaces (ports) so they can be faked in tests and swapped per OS.
- Third-party canvas/graph libraries MUST be confined to `ui/`. Domain types MUST NOT
  import library types; mapping happens in a thin adapter.

**Rationale:** Lets the canvas library or desktop shell change without rewriting the
rules of the app, and keeps every rule unit-testable.

### IV. Calm, Consistent Interface (Design Tokens)

- All spacing, radii, colors, typography, shadows, and motion MUST come from a single
  design-token source. Hard-coded magic values in components are a review blocker.
- Spacing MUST follow an 8 px base grid (4 px allowed for fine internal adjustments).
  Canvas placement and resizing MUST snap to the same grid so components stay evenly
  spaced.
- Every screen and component MUST work in both Light and Dark themes, and every
  text/background pair MUST meet WCAG 2.2 AA contrast (4.5:1 body text, 3:1 large text
  and UI controls).
- Every action reachable by mouse MUST also be reachable by keyboard, with a visible
  focus ring. Motion MUST respect the OS "reduce motion" setting.

**Rationale:** "Evenly spaced and beautiful" is not a vibe — it is a system that can be
enforced in review.

### V. Responsive by Budget

These budgets are release gates, measured on a mid-range laptop:

- Dragging or resizing a section: ≥ 60 fps with 50 sections and 100 connections.
- Cold start to interactive board: < 2 s.
- Idle memory (private working set, 60 s idle, median of 3 runs): < 250 MB; boards of
  50+ sections: < 350 MB.
- Any edit is persisted within 1 s (debounced autosave) without blocking input.
- Pomodoro drift: ≤ 1 s per 25-minute session, including while the window is unfocused
  or minimized (remaining time derives from a wall-clock end timestamp, never from
  counting ticks).

**Rationale:** A tool meant to save attention must never cost attention.

### VI. Secure by Default (Least Privilege)

- The desktop shell MUST grant the web layer only the permissions it needs, via explicit
  capability allow-lists. No general-purpose filesystem or shell access from the UI.
- A strict Content-Security-Policy MUST be set: no remote scripts, no `eval`, no inline
  script injection. User text MUST be rendered as text, never as HTML.
- File access MUST be confined to the app's own data directory unless the user chooses a
  path through a native dialog (import/export).
- Dependencies MUST be pinned via lockfiles and checked with `npm audit` and
  `cargo audit` in CI; high-severity findings block a release.

**Rationale:** A desktop app with a webview is a browser with filesystem access; treat
it with that respect.

### VII. Simplicity & YAGNI

- Build the smallest thing that satisfies the current spec. No speculative abstractions,
  plugin systems, cloud sync, or accounts until a spec asks for them.
- Any deviation that adds a project, layer, or dependency MUST be justified in the
  plan's *Complexity Tracking* table, alongside the simpler alternative that was rejected.

**Rationale:** Most side projects die from scope, not from missing architecture.

## Technology & Quality Standards

- **Languages:** TypeScript in `strict` mode for all UI/state/domain code; Rust (stable)
  for the desktop shell. `any` is forbidden outside typed boundary adapters.
- **Style:** ESLint + Prettier (TS); `rustfmt` + `clippy -D warnings` (Rust). CI fails on
  any lint error.
- **Naming:** descriptive names over comments; comments explain *why*, not *what*.
- **Dependencies:** each new runtime dependency MUST be recorded in the plan's
  `research.md` with purpose, license, and the alternative considered.
- **Outdated tech:** if a chosen library/version reaches end-of-life or a clearly
  better-maintained successor appears, it MUST be flagged in the next plan.

## Development Workflow

- **Branching:** one branch per spec, named by spec-kit (`###-short-name`, e.g.
  `001-sections-board`), cut from `main`. Hotfixes use `fix/<short-description>`.
  `main` is always releasable; merge via pull request only (squash or rebase).
- **Commits:** Conventional Commits (`feat`, `fix`, `test`, `refactor`, `docs`,
  `chore`, `perf`), imperative mood, subject ≤ 72 characters, optional scope —
  e.g. `feat(pomodoro): derive remaining time from end timestamp`.
- **Order of work:** constitution → specify → clarify → plan → tasks → implement.
  Tests for a task are committed before, or in the same commit as, its implementation.
- **Review gate** (self-review is fine for a solo project): before merging, confirm the
  plan's Constitution Check still passes, all tests are green, both themes were checked
  visually, and keyboard access works for anything new.

## Governance

- This constitution supersedes all other conventions in the repository. Where a plan or
  task conflicts with it, the constitution wins until formally amended.
- **Amendments:** edit this file in a dedicated `docs(constitution): …` commit that
  updates the Sync Impact Report and the version line below.
- **Versioning (SemVer):** MAJOR = a principle removed or redefined incompatibly;
  MINOR = a principle or section added or materially expanded; PATCH = wording only.
- **Compliance:** every `/speckit-plan` MUST include a Constitution Check that is
  re-evaluated after design. Violations require a Complexity Tracking entry or a
  design change.

**Version**: 1.1.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-11
