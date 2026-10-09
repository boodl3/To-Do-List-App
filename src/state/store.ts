import { createStore } from 'zustand/vanilla';
import { emptyDocument } from '../domain/defaults';
import type { AppDocument, Board, PomodoroState, Preferences } from '../domain/schema';
import type { Platform } from '../platform/ports';
import * as H from './history';

export interface AppState {
  doc: AppDocument;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  notice: string | null;
  /** Transient UI: id of the field that should take focus next (new task, new section, …). */
  focusRequest: string | null;
  history: H.History;
  hydrate: (doc: AppDocument) => void;
  fail: (error: string) => void;
  /** Apply a pure board update. One undo step unless `history: false` or a gesture is open. */
  updateBoard: (update: (board: Board) => Board, opts?: { history?: boolean }) => void;
  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  /** Timer, theme and pin changes are never part of undo (spec Edge Case "Undo scope"). */
  updatePomodoro: (update: (p: PomodoroState) => PomodoroState) => void;
  updatePrefs: (update: (p: Preferences) => Preferences) => void;
  setNotice: (notice: string | null) => void;
  requestFocus: (id: string | null) => void;
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore(platform: Pick<Platform, 'clock'>) {
  return createStore<AppState>()((set, get) => ({
    doc: emptyDocument(platform.clock.now()),
    status: 'loading',
    error: null,
    notice: null,
    focusRequest: null,
    history: H.emptyHistory,

    hydrate: (doc) => {
      set({ doc, status: 'ready', error: null, history: H.emptyHistory });
    },
    fail: (error) => {
      set({ status: 'error', error });
    },

    updateBoard(update, { history = true } = {}) {
      const { doc, history: h } = get();
      const board = update(doc.board);
      if (board === doc.board) return;
      set({
        doc: { ...doc, board },
        history: history && !h.pending ? H.record(h, doc.board) : h,
      });
    },
    beginGesture() {
      set((s) => ({ history: H.beginGesture(s.history, s.doc.board) }));
    },
    endGesture() {
      set((s) => ({ history: H.endGesture(s.history, s.doc.board) }));
    },
    undo() {
      const { doc, history } = get();
      const step = H.undo(history, doc.board);
      if (step) set({ doc: { ...doc, board: step.board }, history: step.history });
    },
    redo() {
      const { doc, history } = get();
      const step = H.redo(history, doc.board);
      if (step) set({ doc: { ...doc, board: step.board }, history: step.history });
    },

    updatePomodoro(update) {
      set((s) => ({ doc: { ...s.doc, pomodoro: update(s.doc.pomodoro) } }));
    },
    updatePrefs(update) {
      set((s) => ({ doc: { ...s.doc, prefs: update(s.doc.prefs) } }));
    },
    setNotice(notice) {
      set({ notice });
    },
    requestFocus(focusRequest) {
      set({ focusRequest });
    },
  }));
}
