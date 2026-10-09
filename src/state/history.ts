import type { Board } from '../domain/schema';

/**
 * Snapshot undo/redo (research R4). Snapshots are immutable boards sharing structure, so
 * 100 entries cost roughly the changed parts only. The viewport is never restored (pan/zoom
 * is not an undoable action), so applying a snapshot keeps the current viewport.
 */
export const HISTORY_LIMIT = 100;

export interface History {
  readonly past: readonly Board[];
  readonly future: readonly Board[];
  /** Board at the start of an in-progress gesture (drag/resize), or null. */
  readonly pending: Board | null;
}

export const emptyHistory: History = { past: [], future: [], pending: null };

/** Record `before` (the board prior to a change) as one undo step. */
export function record(h: History, before: Board): History {
  return { past: [...h.past, before].slice(-HISTORY_LIMIT), future: [], pending: h.pending };
}

export function beginGesture(h: History, current: Board): History {
  return h.pending ? h : { ...h, pending: current };
}

export function endGesture(h: History, current: Board): History {
  if (!h.pending) return h;
  const changed = h.pending !== current;
  const next = { ...h, pending: null };
  return changed ? record(next, h.pending) : next;
}

type Step = { history: History; board: Board } | null;

export function undo(h: History, current: Board): Step {
  const prev = h.past.at(-1);
  if (!prev) return null;
  return {
    history: { past: h.past.slice(0, -1), future: [current, ...h.future], pending: null },
    board: { ...prev, viewport: current.viewport },
  };
}

export function redo(h: History, current: Board): Step {
  const next = h.future[0];
  if (!next) return null;
  return {
    history: { past: [...h.past, current], future: h.future.slice(1), pending: null },
    board: { ...next, viewport: current.viewport },
  };
}
