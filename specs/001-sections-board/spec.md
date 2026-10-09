# Feature Specification: Sections Board with Pomodoro

**Feature Branch**: `001-sections-board`
**Created**: 2026-10-10
**Status**: Draft
**Input**: User description: "A to-do list desktop app to boost productivity. Starts with a
simple whiteboard (white or black — the user switches between light and dark mode: clicking a
sun icon turns on light mode, clicking a moon icon turns on dark mode). A button lets the user
pin the app on top so it doesn't disappear under other apps. The user creates 'Sections' — each
is like a to-do list that groups tasks; each section is a rounded rectangle with a title and
tasks/subtasks, and next to each task the user enters an estimate of how long it should take.
Sections can be moved around the whiteboard and resized freely. The user can connect sections
with arrows/lines. The user can use a Pomodoro timer that can be moved freely inside the app.
All components are spaced out evenly. UI takes inspiration from the attached reference images
(dark, rounded 'widget' cards with large numerals and vivid accent colors; a soft light variant)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Capture tasks in a section (Priority: P1)

As a student juggling several courses and projects, I want to create a section, give it a
title, and add tasks and subtasks with a time estimate next to each, so that I can see what
needs doing and roughly how long it will take.

**Why this priority**: This is the core value of a to-do app. With only this story the app is
already a usable (single-section) task list — a viable MVP.

**Independent Test**: Open the app on an empty board, create one section, add a title, three
tasks (one with two subtasks), enter estimates, tick one task done, close and reopen the app,
and verify everything is exactly as left.

**Acceptance Scenarios**:

1. **Given** an empty board, **When** the user chooses "New section", **Then** a rounded
   section card appears in the visible area with its title field focused and an
   "Untitled section" placeholder.
2. **Given** a section, **When** the user types a task name and presses Enter, **Then** the
   task is added at the bottom of the list and a new empty task row is focused for rapid entry.
3. **Given** a task, **When** the user indents it (Tab, or "Make subtask"), **Then** it becomes
   a subtask of the task directly above it; Shift+Tab (or "Make task") promotes it back.
4. **Given** a task or subtask, **When** the user enters an estimate such as `25m`, `1h`,
   `1h 30m`, or `1.5h`, **Then** the estimate is accepted and displayed in a consistent
   format (e.g. `1h 30m`) next to the item.
5. **Given** an invalid estimate (e.g. `abc`, a negative number, or more than 99 hours),
   **When** the user leaves the field, **Then** the field is marked invalid with a short
   message and the previous valid value is kept.
6. **Given** a task with subtasks that have estimates, **When** the user views the task,
   **Then** the task shows the sum of its subtasks' estimates as its own estimate.
7. **Given** a section with tasks, **When** the user views the section header, **Then** it
   shows the total estimated time of *incomplete* items and a progress indicator
   (completed / total).
8. **Given** a task, **When** the user ticks its checkbox, **Then** it is shown as done
   (struck through, de-emphasized) and the section's remaining total and progress update
   immediately. Ticking a parent task marks all its subtasks done; ticking every subtask
   marks the parent done; un-ticking a parent un-ticks all its subtasks.
9. **Given** a task, **When** the user deletes it, **Then** it and its subtasks are removed
   and the user can undo the deletion.
10. **Given** a task, **When** the user drags it (or uses a keyboard shortcut) to a new
    position within the same section, **Then** the order updates and persists.

---

### User Story 2 — Arrange sections freely on the board (Priority: P1)

As a user, I want to move and resize sections anywhere on the whiteboard, and have them line
up neatly, so the board reflects how I think about my work without becoming messy.

**Why this priority**: The "whiteboard of sections" is what distinguishes this app from a
plain list; without free arrangement the product idea doesn't hold.

**Independent Test**: Create four sections, drag them into a 2×2 layout, resize one, pan and
zoom the board, restart the app, and confirm the positions, sizes, and gaps are preserved and
evenly spaced.

**Acceptance Scenarios**:

1. **Given** a section, **When** the user drags it by its header, **Then** it follows the
   pointer smoothly and, on release, snaps to the spacing grid.
2. **Given** a section, **When** the user drags any edge or corner, **Then** it resizes
   smoothly, snaps to the spacing grid, and never shrinks below a minimum usable size.
3. **Given** a section whose content is taller than the section, **When** the user scrolls
   inside it, **Then** the tasks scroll within the section while the header stays visible.
4. **Given** sections are being dragged near each other, **When** an edge comes close to
   another section's edge or the standard gap distance, **Then** alignment guides appear and
   the section snaps to align with, or sit the standard gap away from, its neighbour.
5. **Given** an existing set of sections, **When** the user creates a new section, **Then** it
   is placed in the nearest free spot in view, separated from neighbours by the standard gap,
   not on top of an existing section.
6. **Given** a messy board, **When** the user chooses "Tidy up", **Then** sections are
   arranged into rows with uniform gaps, keeping their sizes and their approximate reading
   order (top-to-bottom, left-to-right); the action can be undone.
7. **Given** a large board, **When** the user pans (space+drag, middle-drag, or trackpad) and
   zooms (Ctrl/Cmd + scroll or pinch, or zoom controls), **Then** the view moves smoothly and a
   "Fit all" control brings every section into view.
8. **Given** a section, **When** the user deletes it, **Then** a confirmation is shown if it
   contains tasks, it is removed along with its connections, and the action can be undone.
9. **Given** a section, **When** the user picks an accent color from a small palette,
   **Then** the section's accent (header, progress, checkboxes) uses that color in both themes.

---

### User Story 3 — Focus with a movable Pomodoro timer (Priority: P2)

As a user, I want a Pomodoro timer floating on the board that I can drag anywhere, so I can
time focused work sessions while seeing my tasks.

**Why this priority**: Directly supports the "boost productivity" goal and is independent of
sections; valuable but not required for the list itself.

**Independent Test**: Start a focus session, drag the timer to another corner, switch to a
different app for several minutes, return and confirm the remaining time is correct; let the
session finish and confirm the alert and the automatic switch to a break.

**Acceptance Scenarios**:

1. **Given** the timer is hidden, **When** the user clicks the timer button in the toolbar,
   **Then** a compact timer widget appears showing the current mode (Focus / Short break /
   Long break) and the remaining time in large numerals.
2. **Given** the timer is idle, **When** the user presses Start, **Then** the countdown
   begins; Pause, Resume, Reset, and Skip are available.
3. **Given** a running timer, **When** the user drags the widget, **Then** it moves freely
   within the app window, stays above sections, is never placed fully off-screen, and keeps
   its position across restarts.
4. **Given** a running timer, **When** the app window is unfocused, covered, or minimized,
   **Then** the countdown remains accurate to within one second of real elapsed time.
5. **Given** a focus session reaches zero, **When** time is up, **Then** the user receives a
   system notification and a short sound (if enabled), the completed-session count increases,
   and the next break is prepared (a long break after every 4th focus session by default).
6. **Given** the timer settings, **When** the user changes focus/short-break/long-break
   durations or the long-break interval, **Then** the new values apply from the next session.
7. **Given** a focus session, **When** the user optionally links it to a task, **Then** the
   timer shows that task's name ("Focusing on …").
8. **Given** a session was running when the app was closed, **When** the app is reopened,
   **Then** the timer shows the correct remaining time, or the session as completed if it
   ended while the app was closed.

---

### User Story 4 — Switch between light and dark mode (Priority: P2)

As a user, I want to switch the board between a white (light) and black (dark) theme with a
sun or moon icon, so the app is comfortable in any lighting.

**Why this priority**: Explicitly requested and cheap, but the app is usable without it.

**Independent Test**: Click the moon icon and verify the entire UI (board, sections,
connections, timer, dialogs) switches to dark; click the sun icon and verify light; restart
and confirm the choice is remembered.

**Acceptance Scenarios**:

1. **Given** light mode is active, **When** the user clicks the moon icon, **Then** every part
   of the interface switches to the dark theme without reloading or losing any state.
2. **Given** dark mode is active, **When** the user clicks the sun icon, **Then** every part of
   the interface switches to the light theme.
3. **Given** the theme toggle, **When** the user looks at it, **Then** the icon for the
   *currently active* theme is visibly selected, and each icon has an accessible label
   ("Light mode", "Dark mode").
4. **Given** first launch with no saved choice, **When** the app opens, **Then** it follows the
   operating system's light/dark setting; once the user chooses, their choice persists.

---

### User Story 5 — Keep the app on top (Priority: P2)

As a user working in other apps (browser, IDE), I want to pin the app on top so my task list
and timer stay visible.

**Why this priority**: Explicitly requested and a key part of using the app as a companion
window; usable without it.

**Independent Test**: Enable the pin, click into another application, and confirm the app
window remains visible above it; disable the pin and confirm normal stacking returns.

**Acceptance Scenarios**:

1. **Given** the app is not pinned, **When** the user clicks the pin button, **Then** the
   window stays above all other normal application windows, and the pin button shows an
   active state with the tooltip "Unpin from top".
2. **Given** the app is pinned, **When** the user clicks the pin button again, **Then** the
   window returns to normal stacking.
3. **Given** the user pinned the app, **When** the app is restarted, **Then** the pinned state
   is restored.
4. **Given** the operating system refuses the request, **When** the user clicks the pin,
   **Then** the button does not show as active and a brief message explains it could not pin.

---

### User Story 6 — Connect sections with arrows or lines (Priority: P3)

As a user, I want to draw arrows or plain lines between sections, so I can show order and
dependencies (e.g. "Study for exam" → "Mock exam").

**Why this priority**: Useful for planning but the least essential to daily task tracking.

**Independent Test**: Create two sections, connect them with an arrow, move one section and
confirm the arrow follows; switch the connection to a plain line, add a label, then delete it.

**Acceptance Scenarios**:

1. **Given** two sections, **When** the user drags from a connection handle on one section's
   edge to another section, **Then** an arrow is created from the first to the second.
2. **Given** a connection, **When** either section is moved or resized, **Then** the
   connection follows and stays attached at sensible edge points.
3. **Given** a connection, **When** the user selects it, **Then** they can switch it between
   arrow and plain line, reverse its direction, add or edit a short label, or delete it.
4. **Given** a connection from a section to itself, or a duplicate of an existing connection
   between the same two sections in the same direction, **When** the user tries to create it,
   **Then** it is not created.
5. **Given** a section with connections, **When** the section is deleted, **Then** its
   connections are removed too, and undo restores both.

---

### Edge Cases

- **Empty states**: an empty board shows a short friendly hint and a "New section" button; an
  empty section shows an "Add a task" row.
- **Long text**: very long titles or task names wrap inside the section and never overflow
  its rounded edges.
- **Tiny window**: when the app window is resized very small, the toolbar collapses into an
  overflow menu and the timer is kept within the visible window.
- **Overlap**: sections may temporarily overlap while dragging; the selected section is drawn
  on top. "Tidy up" removes overlaps.
- **Tasks with subtasks and their own estimate**: once a task has subtasks, its estimate is the
  sum of its subtasks; a value the user typed on the parent earlier is kept aside and restored
  if all subtasks are later removed.
- **Unchecking**: un-ticking a subtask of a completed parent marks the parent incomplete.
- **Pause precision**: only one timer exists; pausing freezes the remaining time exactly, and a
  paused timer never completes while paused, however long it stays paused.
- **Clock changes**: if the system clock jumps (e.g. timezone change or sleep), the timer
  recomputes from its end time; a negative remaining time is treated as "completed".
- **Damaged save file**: if saved data cannot be read, the app loads the most recent backup,
  tells the user, and never overwrites the damaged file silently.
- **Undo scope**: undo/redo covers task, section, connection, and layout changes made in the
  current session; theme, pin, and timer controls are not part of undo history.
- **Notifications blocked**: if system notifications are denied, the timer still shows an
  in-app alert at completion.

## Requirements *(mandatory)*

### Functional Requirements

**Board & layout**

- **FR-001**: The app MUST present a single board that can be panned and zoomed (25 %–200 %),
  with a "Fit all" action and a subtle background grid that matches the spacing grid.
- **FR-002**: All spacing in the interface (paddings, gaps between items, toolbar spacing)
  MUST be drawn from one consistent spacing scale based on an 8-point unit.
- **FR-003**: Moving and resizing sections MUST snap to the 8-point grid; snapping can be
  temporarily bypassed by holding a modifier key (Alt/Option).
- **FR-004**: While dragging, the app MUST show alignment guides and snap to neighbours' edges,
  centers, and to the standard gap distance (24 points) from neighbours.
- **FR-005**: The app MUST provide a "Tidy up" action that arranges sections in rows with a
  uniform gap, preserving sizes and approximate reading order.
- **FR-006**: New sections MUST be placed in the nearest free spot in the current view without
  overlapping existing sections.

**Sections**

- **FR-007**: Users MUST be able to create, rename, recolor (from a fixed accessible palette),
  and delete sections; deleting a non-empty section MUST require confirmation.
- **FR-008**: A section MUST be displayed as a rounded rectangle containing a header (title,
  remaining-time total, progress indicator) and a scrollable task list.
- **FR-009**: Sections MUST be freely resizable from any edge or corner with a minimum size
  that keeps the header and at least one task row usable (default minimum 240 × 160 points).

**Tasks & estimates**

- **FR-010**: Users MUST be able to add, edit, reorder, complete/uncomplete, and delete tasks
  within a section, using mouse or keyboard alone.
- **FR-011**: Tasks MUST support one level of subtasks (a subtask cannot have its own subtasks).
- **FR-012**: Each task and subtask MUST accept an optional time estimate entered in minutes
  and/or hours (`25m`, `1h`, `1h 30m`, `1.5h`, `90`), stored in whole minutes, valid range
  1 minute to 99 hours, and displayed in a normalized `Xh Ym` form.
- **FR-013**: A task with subtasks MUST display the sum of its subtasks' estimates as its
  estimate.
- **FR-014**: Each section MUST display the total estimate of its incomplete items and a
  completed/total progress indicator, updating immediately on any change.
- **FR-015**: Completing a parent MUST complete all its subtasks; completing all subtasks MUST
  complete the parent; un-completing any subtask MUST un-complete the parent; un-completing a
  parent MUST un-complete all its subtasks.

**Connections**

- **FR-016**: Users MUST be able to connect two different sections with a connection that is
  either an arrow (directed) or a plain line, optionally with a short label (≤ 40 characters).
- **FR-017**: Connections MUST stay attached when sections move or resize, and MUST be removed
  when either connected section is deleted.
- **FR-018**: The app MUST prevent self-connections and duplicate connections (same two
  sections, same direction).

**Pomodoro**

- **FR-019**: The app MUST provide a single Pomodoro timer widget that can be shown/hidden and
  dragged anywhere inside the app window, stays above board content, and is kept within the
  visible window.
- **FR-020**: The timer MUST support Focus, Short break, and Long break modes with
  configurable durations (defaults 25 / 5 / 15 minutes) and a configurable long-break interval
  (default every 4 focus sessions).
- **FR-021**: The timer MUST support Start, Pause, Resume, Reset, and Skip, and MUST remain
  accurate within ±1 second of real elapsed time over a 25-minute session even when the app
  is unfocused or minimized.
- **FR-022**: On session completion the app MUST notify the user (system notification when
  permitted, otherwise an in-app alert; optional sound) and advance to the next mode without
  auto-starting it.
- **FR-023**: A focus session MAY be linked to one task, whose name is shown on the timer.
- **FR-024**: The app MUST show the number of focus sessions completed today.

**Window, theme, persistence, history**

- **FR-025**: The app MUST provide a pin button that keeps the window above other application
  windows when active, shows its state clearly, and restores the state on restart.
- **FR-026**: The app MUST provide a theme control with a sun icon (light) and a moon icon
  (dark); the active theme applies to every part of the UI instantly, follows the OS setting
  until the user chooses, and the choice persists.
- **FR-027**: Both themes MUST meet WCAG 2.2 AA contrast for text and interactive controls.
- **FR-028**: All board content, layout, timer settings/state, theme, and pin state MUST be
  saved automatically (no manual save) within 1 second of a change and restored on launch.
- **FR-029**: Users MUST be able to undo and redo content and layout changes (at least the
  last 100 actions) via keyboard shortcuts and toolbar buttons.
- **FR-030**: All data MUST stay on the user's device; the feature MUST work fully offline.
- **FR-031**: All interactive controls MUST be reachable and operable by keyboard with a
  visible focus indicator and accessible names; animations MUST respect "reduce motion".

### Key Entities

- **Board**: the single whiteboard; holds sections, connections, the viewport (pan/zoom),
  and the timer widget's position.
- **Section**: a titled, colored, rounded card with a position and size on the board;
  contains an ordered list of tasks.
- **Task**: a to-do item with text, done state, optional estimate (minutes), and an ordered
  list of subtasks; belongs to exactly one section.
- **Subtask**: a task nested one level under a parent task; has text, done state, and an
  optional estimate.
- **Connection**: a link from one section to another with a style (arrow or line) and an
  optional label.
- **Pomodoro timer**: current mode, running/paused/idle status, end time or paused remaining
  time, completed-session count, optional linked task, and user settings (durations,
  long-break interval, sound on/off).
- **Preferences**: theme choice (light, dark, or follow system), pin-on-top state, and window
  size/position.

## Assumptions

- **Single board, single user, single device** for v1. Multiple boards, sync, sharing, and
  accounts are out of scope.
- **Subtasks are one level deep** (FR-011). Deeper nesting tends to hide work rather than
  organize it; this can be revisited in a later spec.
- **Estimates roll up** from subtasks to tasks to the section's remaining total (FR-013/014).
  Estimates are planning aids only; the app does not track actual time per task in v1.
- **Connections link sections**, not individual tasks.
- **Platforms**: Windows 10/11 and macOS 13+ are the primary targets; Linux is best-effort.
- **"Evenly spaced"** is interpreted as: a single 8-point spacing scale throughout the UI, a
  standard 24-point gap between sections, grid snapping, alignment guides, and a "Tidy up"
  action — rather than forcing an automatic layout the user can't override.
- **Visual direction** (from the reference images): rounded "widget" cards with generous
  corner radii, large bold numerals for times and totals, one vivid accent color per section,
  segmented progress bars, deep near-black surfaces in dark mode and soft off-white surfaces
  with subtle depth in light mode.
- Timer completion does not auto-start the next session (avoids surprises); this may become a
  setting later.

## Out of Scope (v1)

- Due dates, reminders, recurring tasks, tags, search, and filters.
- Free-hand drawing, sticky notes, images, or any board object other than sections,
  connections, and the timer.
- Multiple boards, export/import, cloud sync, collaboration, mobile versions.
- Time tracking per task or productivity analytics beyond today's completed-session count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can create a section with a title and three estimated tasks in
  under 60 seconds without instructions.
- **SC-002**: A user can add ten tasks in a row using only the keyboard, without touching the
  mouse.
- **SC-003**: Moving or resizing a section feels immediate: the section tracks the pointer with
  no visible lag on a board of 50 sections and 100 connections.
- **SC-004**: After any change, quitting and relaunching the app restores 100 % of content,
  layout, theme, pin state, and timer state in under 2 seconds.
- **SC-005**: A 25-minute focus session ends within ±1 second of real time, including when the
  app was in the background for the whole session.
- **SC-006**: After "Tidy up", every pair of horizontally or vertically adjacent sections is
  separated by exactly the standard gap, with no overlaps.
- **SC-007**: 100 % of text and controls pass WCAG 2.2 AA contrast in both themes, and every
  feature in this spec can be operated with the keyboard alone.
- **SC-008**: No user data is lost after a forced quit or power loss during editing (at most
  the last 1 second of edits).
