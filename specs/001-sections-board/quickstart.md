# Quickstart: Sections Board with Pomodoro

**Feature**: `001-sections-board` | **Date**: 2026-10-10

How to set up, run, test, and manually validate this feature.

## Prerequisites

| Tool | Notes |
|---|---|
| Node.js (current LTS) + pnpm | `corepack enable` then `pnpm -v` |
| Rust (stable) via rustup | `rustup update stable` |
| Windows | Microsoft C++ Build Tools; WebView2 (preinstalled on Windows 11) |
| macOS | Xcode Command Line Tools (`xcode-select --install`) |
| Linux (best-effort) | `webkit2gtk-4.1` and the packages listed in Tauri's prerequisites guide |

Check the Tauri 2 prerequisites page for the current list before scaffolding — it changes.

## Scaffold (Phase 0 of tasks)

Never run the scaffolder inside the repo: on a non-empty folder it offers to delete existing
files. Scaffold in a temporary folder outside the repo, then copy its files into the repo root
without overwriting `.gitignore` (merge it), `.specify/`, `specs/` or `.claude/`.

```bash
# from a folder OUTSIDE the repo
pnpm create tauri-app focusboard --template react-ts --manager pnpm
# copy focusboard/* into the repo root (see above), then from the repo root:
pnpm add @xyflow/react zustand immer zod @dnd-kit/core @dnd-kit/sortable lucide-react
pnpm add @tauri-apps/plugin-notification
pnpm add -D vitest @vitest/coverage-v8 fast-check @testing-library/react @testing-library/user-event \
  jsdom @playwright/test @axe-core/playwright eslint typescript-eslint prettier stylelint
cd src-tauri && cargo add tauri-plugin-notification tauri-plugin-window-state && cd ..
```


## Run

```bash
pnpm tauri dev          # native window with hot reload
pnpm dev                # browser-only, uses src/platform/fake adapters (fast UI iteration)
```

## Test

```bash
pnpm test               # Vitest: domain + state + components
pnpm test:coverage      # domain/ must be ≥ 90 % lines & branches
pnpm e2e                # Playwright user-story tests, both themes, axe a11y
cargo test --manifest-path src-tauri/Cargo.toml
```

## Manual validation (maps to spec user stories)

Run these in the **native** window (`pnpm tauri dev` or a release build):

1. **US1 – Tasks**: New section → title "Calculus 2" → add "Problem set" (Enter) → Tab to add
   subtasks "Ratio test" `30m` and "Root test" `45m` → parent shows **1h 15m** → tick
   "Ratio test" → header shows **45m remaining**, progress 1/2. Quit & relaunch → unchanged.
2. **US2 – Board**: create 4 sections → drag into a 2×2 grid (watch guides + 24 px gap) →
   resize one from a corner → "Tidy up" → equal gaps, no overlaps → Ctrl/Cmd+Z restores.
3. **US3 – Pomodoro**: set focus to 2 minutes in settings → Start → drag widget to a corner →
   minimize the app → notification appears at 2:00 (±1 s) → widget shows Short break, idle.
4. **US4 – Theme**: click moon → whole UI dark; click sun → light; relaunch → choice kept.
5. **US5 – Pin**: click pin → click your browser → app stays above it → unpin → normal.
6. **US6 – Connections**: drag from a section's edge handle to another → arrow appears →
   move a section → arrow follows → select arrow → switch to line, add label "then", delete.

## Performance check (Constitution V)

Load `tests/fixtures/large-board-50x100.json` (via `pnpm dev:fixture large-board-50x100`),
drag a section for 5 seconds with the browser devtools Performance panel recording — frames
should stay at or above 60 fps. `tests/e2e/perf.spec.ts` automates a rougher version in CI.

## Data location

The board is saved as `focusboard.json` (+ `.bak`) in the OS app-data directory for the app's
bundle identifier, e.g. `%APPDATA%\<identifier>\` on Windows or
`~/Library/Application Support/<identifier>/` on macOS.
