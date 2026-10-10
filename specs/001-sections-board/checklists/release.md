# Release Checklist: Sections Board with Pomodoro (v0.1.0)

**Feature**: [spec.md](../spec.md) | **Recorded**: 2026-10-10 | **Build**: Windows 11, release (NSIS)

## Automated gates

| Gate | Result |
|---|---|
| Unit / component tests (Vitest) | 239 passed |
| Domain coverage (Constitution II, ≥ 90 %) | lines 99 %, branches 98 % |
| Rust tests (`cargo test`) | 16 passed (storage, timer scheduler) |
| E2E (Playwright, light + dark) | 89 passed: all six user stories, edge cases, visual baselines |
| Accessibility (axe, WCAG 2.2 AA) | 0 violations on board, menus, dialogs, timer settings, connection toolbar |
| Contrast tokens (WCAG 2.2 AA) | 49 checks pass in both themes |
| Lint (ESLint + layer rules, Stylelint token rule, Prettier, tsc, clippy `-D warnings`) | clean |
| Drag frame time, 50 sections + 100 connections (headless CI check) | median 16.7 ms, p95 16.8 ms |
| `pnpm audit --prod --audit-level high` | no known vulnerabilities |
| `cargo audit` | no vulnerabilities; 2 allowed warnings (below) |

## Constitution V release gates (native release build, large fixture)

Measured with `node scripts/measure-release.mjs` on the NSIS release build (process launch →
`board-ready` mark; Task Manager's *private working set* of the app and its WebView2 processes
after 60 s idle). Window 1200×800.

| Budget | Target | Empty board | `v1` (2 sections) | Large (50 sections, 100 connections) |
|---|---|---|---|---|
| Cold start to interactive board | < 2 s | 0.69 s ✅ | 0.68 s ✅ | 0.71 s ✅ |
| Idle memory (private working set) | < 250 MB | 130 MB ✅ | 161 MB ✅ | **331 MB ❌** |

**Release gate: BLOCKED on idle memory for the 50-section stress board.** Breakdown of the
large board: WebView2 GPU process 196 MB, renderer 92 MB, JS heap only 17 MB. The WebView2
baseline alone is ~130 MB (61 MB of it GPU). Injecting CSS at runtime (no shadows, no backdrop
blur, no scrollers) did not lower GPU memory, but the GPU process pools textures, so that probe
is inconclusive. Next steps, in order:

1. Measure with React Flow `onlyRenderVisibleElements` (only on-screen sections painted).
2. Rebuild-per-variant to find the GPU layers (card scrollers, shadows, viewport layer), using
   `chrome://tracing`-style GPU memory dumps via the debugging port.
3. If WebView2's floor makes 250 MB unreachable for this board, amend the budget explicitly in
   the constitution (Governance: amendments) rather than ignore it.

## Known advisories (not blocking)

- **`braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm, high)**: dev-only, via Stylelint's glob matching of
  our own lint patterns; not shipped in the app and no patched version exists. CI audits
  production dependencies; revisit when Stylelint updates `micromatch`.
- **`proc-macro-error` (RUSTSEC-2024-0370, unmaintained)** and **`glib`
  (RUSTSEC-2024-0429, unsound `VariantStrIter`)**: transitive Tauri dependencies; `glib` is only
  used on Linux. No action available here; track Tauri updates.

## Manual validation on the native shell (quickstart.md)

These need a person at the real window; the browser E2E suite covers the same flows with fake
platform adapters.

- [ ] US1: Calculus 2 walkthrough; quit and relaunch, everything restored
- [ ] US2: 2×2 layout with guides and 24 px gaps; corner resize; Tidy up; Ctrl+Z
- [ ] US3: 2-minute focus session while minimized → OS notification within ±1 s; widget shows Short break
- [ ] US4: moon / sun switch everything; choice kept after relaunch
- [ ] US5: pinned window stays above another app; unpin restores normal stacking
- [ ] US6: drag an arrow between sections; it follows a moved section; restyle, label, delete
- [ ] macOS pass (pin, notifications, background accuracy); note the full-screen Spaces limitation (research R7)

## Follow-ups

- Idle memory on the 50-section board (see above) — blocks release.
- Ctrl+Arrow resize records one undo step per key press (not coalesced).
