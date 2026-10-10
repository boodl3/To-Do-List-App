# Focusboard

A local-first desktop whiteboard for to-do lists. Create **sections** (rounded cards of tasks and
one level of subtasks, each with a time estimate), arrange them freely on a pannable board, link
them with **arrows or lines**, and focus with a **movable Pomodoro timer**. Light and dark themes,
pin-on-top, and full keyboard control. Everything stays on your machine.

Built with Tauri 2 (Rust) and React 19 + TypeScript. The full specification, plan and task list
live in [`specs/001-sections-board/`](specs/001-sections-board/spec.md); project principles are in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

## Prerequisites

- Node.js (current LTS or newer) and pnpm 10 (`npm install -g pnpm@10`)
- Rust stable via rustup
- Windows: Visual Studio C++ Build Tools and WebView2 (preinstalled on Windows 11)
- macOS: Xcode Command Line Tools
- Linux: the packages in Tauri's prerequisites guide (`webkit2gtk-4.1`, …)

```bash
pnpm install
```

## Run

```bash
pnpm tauri dev
```

Native window with hot reload.

```bash
pnpm dev
```

Browser only, using in-memory fake platform adapters (fast UI work). Add `?fixture=v1` or
`?fixture=large-board-50x100` to the URL to load a test board, or run `pnpm dev:fixture`.

## Test

```bash
pnpm test
```

Vitest: domain, state and component tests. `pnpm test:coverage` enforces ≥ 90 % on `src/domain`.

```bash
pnpm e2e
```

Playwright: every user story in light and dark, axe accessibility audit, a frame-time check on a
50-section board, and Windows visual baselines.

```bash
pnpm lint
```

ESLint (including layer import rules), Stylelint (no raw colours/px in components), Prettier, tsc.

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Rust: atomic storage with backup/quarantine, and the timer scheduler.

## Keyboard

| Keys                                               | Action                                             |
| -------------------------------------------------- | -------------------------------------------------- |
| Enter in a task                                    | New task below (new subtask inside a subtask list) |
| Tab / Shift+Tab in a task                          | Make subtask / make task                           |
| Alt+↑ / Alt+↓                                      | Reorder a task                                     |
| Backspace in an empty task                         | Delete it                                          |
| Arrows on a focused section                        | Move 8 px (Shift: 24 px)                           |
| Ctrl/Cmd+Arrows on a focused section               | Resize                                             |
| Delete on a focused section or selected connection | Delete it                                          |
| Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y             | Undo / redo                                        |
| Alt while dragging or resizing                     | Don't snap                                         |

## Data

The board is saved automatically to `focusboard.json` in the app's data folder, for example
`%APPDATA%\app.focusboard.desktop\` on Windows or
`~/Library/Application Support/app.focusboard.desktop/` on macOS. Each save keeps the previous file
as `focusboard.json.bak`. A file that can't be read is renamed to `focusboard.corrupt-<time>.json`
and never deleted.
