import { DEFAULT_SECTION, GRID } from '../domain/defaults';
import { newId } from '../domain/ids';
import { findFreeSpot, type Rect } from '../domain/layout/placement';
import { snapRect } from '../domain/layout/snap';
import { tidy } from '../domain/layout/tidy';
import * as S from '../domain/sections';
import { createSection, renameSection, updateSection } from '../domain/sections';
import type { Accent, Section, Viewport } from '../domain/schema';
import * as P from '../domain/pomodoro';
import type { PomodoroSettings } from '../domain/schema';
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

  /** Let Rust fire the completion alert even while the webview is throttled (research R6). */
  const scheduleCompletion = () => {
    const p = pomodoro();
    if (p.status.kind !== 'running' || !p.sessionId) return;
    platform.timer
      .schedule({ sessionId: p.sessionId, endsAtMs: p.status.endsAt, ...P.completionMessage(p) })
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
    state().signalCompletion();
  };
  /** A deleted task can't stay linked to the timer (data-model PomodoroState.linkedTaskId). */
  const unlinkIfGone = () => {
    const id = pomodoro().linkedTaskId;
    if (!id) return;
    const exists = state().doc.board.sections.some((s) =>
      s.tasks.some((t) => t.id === id || t.subtasks.some((x) => x.id === id)),
    );
    if (!exists) state().updatePomodoro((p) => ({ ...p, linkedTaskId: null }));
  };
  const inSection = (sectionId: string, fn: (s: Section) => Section) => {
    state().updateBoard((b) => updateSection(b, sectionId, fn));
  };
  const flatIds = (sectionId: string) =>
    state()
      .doc.board.sections.find((s) => s.id === sectionId)
      ?.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]) ?? [];

  const api = {
    /** New section in the nearest free spot of the visible board area (FR-006). */
    addSection(visible: Rect): string {
      const id = newId();
      state().updateBoard((b) => {
        const { x, y } = findFreeSpot(b.sections, DEFAULT_SECTION, visible);
        return createSection(b, { id, x, y, now: now() });
      });
      state().requestFocus(titleFocusId(id));
      return id;
    },
    recolorSection(sectionId: string, accent: Accent) {
      state().updateBoard((b) => S.recolorSection(b, sectionId, accent));
    },
    /** Empty sections go at once; others wait for confirmation (FR-007). */
    requestDeleteSection(sectionId: string) {
      const section = state().doc.board.sections.find((s) => s.id === sectionId);
      if (!section) return;
      if (section.tasks.length === 0) api.deleteSection(sectionId);
      else state().setConfirmDelete(sectionId);
    },
    deleteSection(sectionId: string) {
      state().setConfirmDelete(null);
      state().updateBoard((b) => S.deleteSection(b, sectionId));
      unlinkIfGone();
    },

    /** Drag/resize: one undo step from start to end (research R4 gesture coalescing). */
    startGesture(sectionId: string) {
      state().beginGesture();
      state().updateBoard((b) => S.bringToFront(b, sectionId));
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
    renameSection(sectionId: string, title: string) {
      state().updateBoard((b) => renameSection(b, sectionId, title));
    },

    /** Appends from the "Add a task" row (focus stays there), or inserts after `afterId`. */
    addTask(sectionId: string, text: string, afterId?: string): string {
      const id = newId();
      inSection(sectionId, (s) => T.addTask(s, id, text, afterId));
      if (afterId) state().requestFocus(id);
      return id;
    },
    addSubtask(sectionId: string, parentId: string, afterId: string): string {
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
      state().updatePomodoro((p) => P.start(p, now(), newId()));
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
      state().updatePomodoro((p) => P.updateSettings(p, settings));
    },
    setWidget(patch: Partial<{ x: number; y: number; visible: boolean }>) {
      state().updatePomodoro((p) => ({ ...p, widget: { ...p.widget, ...patch } }));
    },
    /** Always-on-top (FR-025): store only what the OS actually applied. */
    async setPinned(pinned: boolean) {
      const applied = await platform.window.setPinned(pinned).catch(() => false);
      state().updatePrefs((p) => ({ ...p, pinned: applied }));
      if (applied !== pinned) state().setNotice("Couldn't keep the window on top.");
    },
    focusOn(taskId: string) {
      state().updatePomodoro((p) => ({
        ...p,
        linkedTaskId: taskId,
        widget: { ...p.widget, visible: true },
      }));
    },
  };
  return api;
}

export type Actions = ReturnType<typeof createActions>;
