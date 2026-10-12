import { DEFAULT_SECTION, GRID } from '../domain/defaults';
import { newId } from '../domain/ids';
import { findFreeSpot, type Rect } from '../domain/layout/placement';
import { snapRect } from '../domain/layout/snap';
import { tidy } from '../domain/layout/tidy';
import * as S from '../domain/sections';
import { createSection, renameSection, updateSection } from '../domain/sections';
import type { Accent, Connection, Section, Viewport } from '../domain/schema';
import * as C from '../domain/connections';
import * as P from '../domain/pomodoro';
import { itemEstimate } from '../domain/rollup';
import type { PomodoroSettings, PomodoroState } from '../domain/schema';
import * as T from '../domain/tasks';
import type { Platform } from '../platform/ports';
import type { AppStore } from './store';

/** Focus id for a section's "Add a task" row. */
export const addRowFocusId = (sectionId: string) => `add:${sectionId}`;
/** Focus id for a section's title field. */
export const titleFocusId = (sectionId: string) => `title:${sectionId}`;

/** User intents → pure domain functions → one store update (and undo step) each. */
export function createActions(
  store: AppStore,
  platform: Pick<Platform, 'clock' | 'timer' | 'window'>,
) {
  const state = () => store.getState();
  const now = () => platform.clock.now();
  const pomodoro = () => state().doc.pomodoro;

  /**
   * Let Rust fire the completion alert, sound included, even while the webview is throttled or
   * hidden (research R6, R10). Re-scheduling replaces the previous completion.
   */
  const scheduleCompletion = () => {
    const p = pomodoro();
    if (p.status.kind !== 'running' || !p.sessionId) return;
    platform.timer
      .schedule({
        sessionId: p.sessionId,
        endsAtMs: p.status.endsAt,
        sound: p.settings.sound,
        ...P.completionMessage(p),
      })
      .catch((e: unknown) => {
        state().setNotice(`Couldn't schedule the timer alert: ${String(e)}`);
      });
  };
  const cancelCompletion = () => {
    const id = pomodoro().sessionId;
    if (id) void platform.timer.cancel(id);
  };
  const announce = (message: { title: string; body: string }) => {
    state().setNotice(`${message.title} ${message.body}`);
  };
  const linked = () => {
    const id = pomodoro().linkedTaskId;
    return id ? T.findItem(state().doc.board, id) : null;
  };
  /** Focus sessions on a task last its estimate (null: the focus setting). */
  const linkedEstimate = () => {
    const found = linked();
    return found ? itemEstimate(found.item) : null;
  };
  /** A deleted task can't stay linked to the timer (data-model PomodoroState.linkedTaskId). */
  const unlinkIfGone = () => {
    if (pomodoro().linkedTaskId && !linked()) {
      state().updatePomodoro((p) => ({ ...p, linkedTaskId: null }));
    }
  };
  const inSection = (sectionId: string, fn: (s: Section) => Section) => {
    state().updateBoard((b) => updateSection(b, sectionId, fn));
  };
  const flatIds = (sectionId: string) =>
    state()
      .doc.board.sections.find((s) => s.id === sectionId)
      ?.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]) ?? [];

  const api = {
    /** New section (or note) in the nearest free spot of the visible board area (FR-006). */
    addSection(visible: Rect, { note = false } = {}): string {
      const id = newId();
      state().updateBoard((b) => {
        const { x, y } = findFreeSpot(b.sections, DEFAULT_SECTION, visible);
        return createSection(b, { id, x, y, now: now(), note });
      });
      state().requestFocus(titleFocusId(id));
      return id;
    },
    recolorSection(sectionId: string, accent: Accent) {
      state().updateBoard((b) => S.recolorSection(b, sectionId, accent));
    },
    /** Empty sections and notes go at once; others wait for confirmation (FR-007). */
    requestDeleteSection(sectionId: string) {
      const section = state().doc.board.sections.find((s) => s.id === sectionId);
      if (!section) return;
      if (section.tasks.length === 0 && !section.note) api.deleteSection(sectionId);
      else state().setConfirmDelete(sectionId);
    },
    deleteSection(sectionId: string) {
      state().setConfirmDelete(null);
      state().updateBoard((b) => S.deleteSection(b, sectionId));
      unlinkIfGone();
    },

    /** Drag/resize: one undo step from start to end (research R4 gesture coalescing). */
    /**
     * Coalesces the following edits into one undo step until `endGesture`. With a section id the
     * section is also brought to front (drag/resize); without, the DOM order is left alone, which
     * keeps an open popover inside the section from being closed by the reorder.
     */
    startGesture(sectionId?: string) {
      state().beginGesture();
      if (sectionId) state().updateBoard((b) => S.bringToFront(b, sectionId));
    },
    endGesture() {
      state().endGesture();
    },
    moveSection(sectionId: string, x: number, y: number) {
      state().updateBoard((b) => S.moveSection(b, sectionId, x, y));
    },
    resizeSection(sectionId: string, rect: Rect, { snap = true } = {}) {
      state().updateBoard((b) => S.resizeSection(b, sectionId, snap ? snapRect(rect) : rect));
    },
    /** Arrow keys: move by `dx, dy`; with `resize`, grow/shrink width/height instead. */
    nudgeSection(sectionId: string, dx: number, dy: number, { resize = false } = {}) {
      const s = state().doc.board.sections.find((x) => x.id === sectionId);
      if (!s) return;
      if (resize)
        api.resizeSection(sectionId, { ...s, width: s.width + dx, height: s.height + dy });
      else api.moveSection(sectionId, s.x + dx, s.y + dy);
    },
    tidyUp(visibleWidth: number) {
      state().updateBoard((b) => {
        const rowWidth = Math.max(visibleWidth, ...b.sections.map((s) => s.width));
        return S.applyPositions(b, tidy(b.sections, rowWidth - (rowWidth % GRID)));
      });
    },
    /** Pan/zoom is saved but never undoable. */
    setViewport(viewport: Viewport) {
      state().updateBoard((b) => ({ ...b, viewport }), { history: false });
    },
    // Connections (US6). Each is one undo step.
    connect(from: string, to: string) {
      state().updateBoard((b) => C.connect(b, { id: newId(), from, to }));
    },
    restyleConnection(id: string, style: Connection['style']) {
      state().updateBoard((b) => C.restyle(b, id, style));
    },
    reshapeConnection(id: string, shape: Connection['shape']) {
      state().updateBoard((b) => C.reshape(b, id, shape));
    },
    reverseConnection(id: string) {
      state().updateBoard((b) => C.reverse(b, id));
    },
    labelConnection(id: string, label: string) {
      state().updateBoard((b) => C.setLabel(b, id, label));
    },
    removeConnection(id: string) {
      state().updateBoard((b) => C.removeConnection(b, id));
    },
    renameSection(sectionId: string, title: string) {
      state().updateBoard((b) => renameSection(b, sectionId, title));
    },
    /** Live while typing; the editor wraps a focus visit in a gesture, so it's one undo step. */
    editNote(sectionId: string, html: string) {
      state().updateBoard((b) => S.editNote(b, sectionId, html));
    },

    /** Appends from the "Add a task" row (focus stays there), or inserts after `afterId`. */
    addTask(sectionId: string, text: string, afterId?: string): string {
      const id = newId();
      inSection(sectionId, (s) => T.addTask(s, id, text, afterId));
      if (afterId) state().requestFocus(id);
      return id;
    },
    /** Inserts after `afterId`, or appends to the parent's subtasks. */
    addSubtask(sectionId: string, parentId: string, afterId?: string): string {
      const id = newId();
      inSection(sectionId, (s) => T.addSubtask(s, parentId, id, '', afterId));
      state().requestFocus(id);
      return id;
    },
    editText(sectionId: string, itemId: string, text: string) {
      inSection(sectionId, (s) => T.editText(s, itemId, text));
    },
    setEstimate(sectionId: string, itemId: string, minutes: number | null) {
      inSection(sectionId, (s) => T.setEstimate(s, itemId, minutes));
    },
    toggleDone(sectionId: string, itemId: string) {
      inSection(sectionId, (s) => T.toggleDone(s, itemId));
    },
    indent(sectionId: string, itemId: string) {
      inSection(sectionId, (s) => T.indent(s, itemId));
      state().requestFocus(itemId);
    },
    outdent(sectionId: string, itemId: string) {
      inSection(sectionId, (s) => T.outdent(s, itemId));
      state().requestFocus(itemId);
    },
    moveTo(sectionId: string, itemId: string, toIndex: number) {
      inSection(sectionId, (s) => T.moveItem(s, itemId, toIndex));
    },
    moveBy(sectionId: string, itemId: string, delta: number) {
      inSection(sectionId, (s) => T.moveItem(s, itemId, T.indexOfItem(s, itemId) + delta));
      state().requestFocus(itemId);
    },
    /** Deletes an item; with `focusPrevious`, focus moves to the item above (or the add row). */
    deleteItem(sectionId: string, itemId: string, { focusPrevious = false } = {}) {
      const ids = flatIds(sectionId);
      const previous = ids[ids.indexOf(itemId) - 1];
      inSection(sectionId, (s) => T.deleteItem(s, itemId));
      unlinkIfGone();
      if (focusPrevious) state().requestFocus(previous ?? addRowFocusId(sectionId));
    },

    // Pomodoro (US3). Timer state is never part of undo history.
    timerStart() {
      state().updatePomodoro((p) => P.start(p, now(), newId(), linkedEstimate()));
      scheduleCompletion();
    },
    timerPause() {
      cancelCompletion();
      state().updatePomodoro((p) => P.pause(p, now()));
    },
    timerResume() {
      state().updatePomodoro((p) => P.resume(p, now()));
      scheduleCompletion();
    },
    timerReset() {
      cancelCompletion();
      state().updatePomodoro(P.reset);
    },
    timerSkip() {
      cancelCompletion();
      state().updatePomodoro(P.skip);
    },
    /** Finish the focus session early: tick the linked task done and start the break. */
    timerCompleteTask() {
      const p = pomodoro();
      if (p.mode !== 'focus' || p.status.kind === 'idle') return;
      cancelCompletion();
      const found = linked();
      if (found && !found.item.done) api.toggleDone(found.section.id, found.item.id);
      state().updatePomodoro((q) => ({
        ...P.start(P.complete(q, now()), now(), newId()),
        linkedTaskId: null,
      }));
      scheduleCompletion();
    },
    /** The scheduled completion fired; stale sessions are ignored. */
    timerCompleted(sessionId: string) {
      const p = pomodoro();
      if (p.sessionId !== sessionId || p.status.kind !== 'running') return;
      const message = P.completionMessage(p);
      state().updatePomodoro((q) => P.complete(q, now()));
      announce(message);
    },
    /** After launch, wake-up or a clock jump: finish overdue sessions, re-arm running ones. */
    reconcileTimer() {
      const before = pomodoro();
      const message = P.completionMessage(before);
      state().updatePomodoro((p) => P.reconcile(p, now()));
      if (before.status.kind === 'running' && pomodoro().status.kind === 'idle') announce(message);
      else scheduleCompletion();
    },
    setTimerSettings(settings: PomodoroSettings) {
      const soundChanged = pomodoro().settings.sound !== settings.sound;
      state().updatePomodoro((p) => P.updateSettings(p, settings));
      // Durations apply next session, but the sound toggle applies to the running one too.
      if (soundChanged) scheduleCompletion();
    },
    setWidget(patch: Partial<PomodoroState['widget']>) {
      state().updatePomodoro((p) => ({ ...p, widget: { ...p.widget, ...patch } }));
    },
    /** Always-on-top (FR-025): store only what the OS actually applied. */
    async setPinned(pinned: boolean) {
      const applied = await platform.window.setPinned(pinned).catch(() => false);
      state().updatePrefs((p) => ({ ...p, pinned: applied }));
      if (applied !== pinned) state().setNotice("Couldn't keep the window on top.");
    },
    /**
     * Link the timer to a task. A task with an estimate also sets the timer up for it: an idle
     * focus session of that length, unless that task's session is already under way.
     */
    focusOn(taskId: string) {
      const p = pomodoro();
      const found = T.findItem(state().doc.board, taskId);
      const estimate = found && itemEstimate(found.item);
      const underway = p.linkedTaskId === taskId && p.status.kind !== 'idle';
      if (estimate && !underway) cancelCompletion();
      state().updatePomodoro((q) => ({
        ...(estimate && !underway ? { ...P.reset(q), mode: 'focus' as const } : q),
        linkedTaskId: taskId,
        widget: { ...q.widget, visible: true },
      }));
    },
  };
  return api;
}

export type Actions = ReturnType<typeof createActions>;
