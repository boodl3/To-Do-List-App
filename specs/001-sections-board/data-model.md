# Phase 1 Data Model: Sections Board with Pomodoro

**Feature**: `001-sections-board` | **Date**: 2026-10-10 | **Plan**: [plan.md](./plan.md)

All types live in `src/domain/` as plain TypeScript (no library types). The persisted shape is
validated with Zod at load time; the published JSON Schema is
[contracts/app-document.schema.json](./contracts/app-document.schema.json).

## Overview

```text
AppDocument (persisted, schemaVersion = 1)
├── board: Board                    ← undo/redo applies here only
│   ├── sections: Section[]         (array order = z-order, last = on top)
│   │   └── tasks: Task[]           (array order = display order)
│   │       └── subtasks: Subtask[] (one level only)
│   ├── connections: Connection[]
│   └── viewport: Viewport
├── pomodoro: PomodoroState
└── prefs: Preferences
```

**Why nested (not normalized) storage?** Every task belongs to exactly one section and every
subtask to exactly one task, so ownership *is* the tree. Nesting makes "delete section" delete
its tasks automatically and keeps the file human-readable. Normalized maps (`tasksById`) would
make cross-section moves cheaper — not needed in v1 (YAGNI). Selectors build lookup indexes
in memory when needed.

## Entities

### Board

| Field | Type | Rules |
|---|---|---|
| `sections` | `Section[]` | ≤ 500 (soft limit; perf budget is defined at 50). IDs unique. |
| `connections` | `Connection[]` | Every `from`/`to` must reference an existing section. |
| `viewport` | `{ x: number; y: number; zoom: number }` | `0.25 ≤ zoom ≤ 2`. |

### Section

| Field | Type | Rules |
|---|---|---|
| `id` | `SectionId` (UUID v4 string, branded type) | Immutable. |
| `title` | `string` | 0–120 chars, trimmed on save; empty renders "Untitled section". |
| `accent` | `'orange' \| 'mint' \| 'pink' \| 'yellow' \| 'violet' \| 'sky'` | Default cycles through palette for new sections. |
| `x`, `y` | `number` (board units, px at zoom 1) | Multiples of 8 after any snapped move. |
| `width`, `height` | `number` | `width ≥ 240`, `height ≥ 160`; multiples of 8 after snapped resize. |
| `tasks` | `Task[]` | ≤ 500 per section. |
| `createdAt` | `number` (epoch ms) | Used for stable tie-breaking in Tidy-up. |

### Task

| Field | Type | Rules |
|---|---|---|
| `id` | `TaskId` (UUID) | Unique across the board. |
| `text` | `string` | 0–500 chars; rendered as plain text only (never HTML). |
| `done` | `boolean` | See completion rules. |
| `estimateMin` | `number \| null` | Integer 1–5940 (99 h). **Ignored for display when `subtasks.length > 0`.** |
| `subtasks` | `Subtask[]` | Subtasks cannot nest further (enforced by type: `Subtask` has no `subtasks`). |

### Subtask

| Field | Type | Rules |
|---|---|---|
| `id` | `TaskId` (UUID) | Unique across the board. |
| `text` | `string` | 0–500 chars. |
| `done` | `boolean` | |
| `estimateMin` | `number \| null` | Integer 1–5940. |

### Connection

| Field | Type | Rules |
|---|---|---|
| `id` | `ConnectionId` (UUID) | |
| `from`, `to` | `SectionId` | `from ≠ to`; no two connections with the same `(from, to)`. |
| `style` | `'arrow' \| 'line'` | `arrow` draws a head at `to`. A `line` is still stored directed so "reverse" is meaningful if switched back to arrow. |
| `label` | `string` | 0–40 chars. |

### PomodoroState

| Field | Type | Rules |
|---|---|---|
| `settings` | `{ focusMin: number; shortBreakMin: number; longBreakMin: number; longBreakEvery: number; sound: boolean }` | focus 1–120, short 1–60, long 1–90, every 2–10. Defaults 25/5/15/4/true. |
| `mode` | `'focus' \| 'shortBreak' \| 'longBreak'` | |
| `status` | discriminated union, see below | |
| `sessionId` | `string \| null` | New UUID on each Start; used to cancel scheduled completion. |
| `focusStreak` | `number` | Focus sessions completed since last long break. |
| `completedToday` | `{ date: string /* YYYY-MM-DD local */; count: number }` | Resets when local date changes. |
| `linkedTaskId` | `TaskId \| null` | Cleared if the task is deleted. |
| `widget` | `{ x: number; y: number; visible: boolean }` | Window-space px; clamped into the window on load/resize. |

```ts
type TimerStatus =
  | { kind: 'idle' }                          // full duration of current mode
  | { kind: 'running'; endsAt: number }       // epoch ms — the single source of truth
  | { kind: 'paused'; remainingMs: number };  // frozen exactly at pause time
```

### Preferences

| Field | Type | Rules |
|---|---|---|
| `theme` | `'system' \| 'light' \| 'dark'` | `system` only until the user first clicks sun/moon. |
| `pinned` | `boolean` | Applied on launch; reverted to `false` if the OS call fails. |

## Derived values (selectors — never stored)

```text
taskEstimate(t)        = t.subtasks.length > 0 ? Σ s.estimateMin (null → 0) : (t.estimateMin ?? 0)
remainingEstimate(t)   = t.subtasks.length > 0 ? Σ over !s.done of s.estimateMin : (!t.done ? t.estimateMin : 0)
sectionRemaining(S)    = Σ over t ∈ S.tasks of remainingEstimate(t)
sectionProgress(S)     = (#done leaf items) / (#leaf items)   // leaf = subtask, or task without subtasks
remainingMs(p, now)    = running ? max(0, endsAt − now) : paused ? remainingMs : durationOf(mode)
```

Counting *leaf* items for progress avoids double-counting a parent and its subtasks.

> When a task gains its first subtask, its own `estimateMin` is left untouched in storage but
> ignored for display; if every subtask is later removed, the original value reappears
> (spec Edge Case "Tasks with subtasks and their own estimate"). No extra field needed.

## State transitions

### Task completion (FR-015)

```text
toggle(parent → done)        ⇒ parent.done = true;  all subtasks.done = true
toggle(parent → not done)    ⇒ parent.done = false; subtasks unchanged
toggle(subtask → done)       ⇒ if all siblings done → parent.done = true
toggle(subtask → not done)   ⇒ parent.done = false
```

### Pomodoro state machine (FR-020 – FR-022)

```text
            start(now)                       pause(now)
   idle ───────────────▶ running{endsAt} ───────────────▶ paused{remainingMs}
    ▲                      │   ▲                              │
    │ reset                │   └────────── resume(now) ───────┘
    │                      │ complete(now ≥ endsAt) / skip
    │                      ▼
    └──────────────── advanceMode():  focus → (focusStreak+1 % every == 0 ? longBreak : shortBreak)
                                      break → focus
                      (lands in idle; next session is not auto-started)
```

- `start` creates a new `sessionId` and sets `endsAt = now + duration`.
- `pause` sets `remainingMs = max(0, endsAt − now)`; `resume` sets `endsAt = now + remainingMs`.
- `complete` from focus increments `focusStreak` and `completedToday.count`; `skip` does not.
- On load with `running` and `endsAt ≤ now` → apply `complete`.

## Estimate input grammar (FR-012)

```text
estimate := number                    ; plain number = minutes  ("90" → 90)
          | number "h" [ number "m" ] ; "1h", "1h 30m", "1h30m"
          | number "m"                ; "25m"
          | decimal "h"               ; "1.5h" → 90, rounded to nearest minute
whitespace and case are ignored; "min", "hr", "hrs" accepted as aliases.
valid range: 1 … 5940 minutes; 0 or empty clears the estimate.
format(m) := m < 60 ? "{m}m" : (m % 60 == 0 ? "{h}h" : "{h}h {m}m")
```

## Layout rules (FR-003 – FR-006)

- `snap(v) = round(v / 8) × 8` for x, y, width, height (unless Alt held).
- **Alignment guides**: while dragging, candidate x-lines = other sections' left, center,
  right, and `right + 24` / `left − 24`; same for y. Snap if within 6 px (screen space).
- **Free-spot placement**: scan candidate positions on the 8 px grid in an outward spiral from
  the viewport center; first rectangle (inflated by 24 px) that intersects no section wins.
- **Tidy-up**: sort sections by `(row band of y, x, createdAt)`; lay out left→right, wrapping
  to a new row when the next card would exceed the current row width target
  (`max(viewport width, widest section)`); gaps exactly 24 px; row height = tallest card.

## Migrations

`migrations: Record<number, (doc: unknown) => unknown>` — `schemaVersion` 1 is the first;
the loader runs `migrate(n → n+1)` until current, then validates. Each migration ships with a
fixture-based test (`fixtures/v{n}.json`).
