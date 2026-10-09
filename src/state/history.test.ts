import { describe, expect, it } from 'vitest';
import { emptyDocument } from '../domain/defaults';
import type { Board } from '../domain/schema';
import {
  beginGesture,
  emptyHistory,
  endGesture,
  HISTORY_LIMIT,
  record,
  redo,
  undo,
} from './history';

const base = emptyDocument(0).board;
// Snapshots are opaque to history; a `tag` field tells them apart in assertions.
const tagged = (n: number): Board => ({ ...base, tag: n }) as unknown as Board;
const tag = (b: Board) => (b as unknown as { tag: number }).tag;

describe('history', () => {
  it('undoes and redoes', () => {
    let h = record(emptyHistory, tagged(1)); // board went 1 → 2
    const u = undo(h, tagged(2));
    expect(u && tag(u.board)).toBe(1);
    h = u!.history;
    const r = redo(h, u!.board);
    expect(r && tag(r.board)).toBe(2);
  });

  it('returns null when there is nothing to undo or redo', () => {
    expect(undo(emptyHistory, tagged(1))).toBeNull();
    expect(redo(emptyHistory, tagged(1))).toBeNull();
  });

  it(`keeps at most ${HISTORY_LIMIT} entries`, () => {
    let h = emptyHistory;
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) h = record(h, tagged(i));
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(tag(h.past[0]!)).toBe(5);
  });

  it('clears redo on a new change', () => {
    let h = record(emptyHistory, tagged(1));
    h = undo(h, tagged(2))!.history;
    expect(h.future).toHaveLength(1);
    h = record(h, tagged(1));
    expect(h.future).toHaveLength(0);
  });

  it('coalesces a gesture into one entry', () => {
    const start = tagged(1);
    let h = beginGesture(emptyHistory, start);
    h = beginGesture(h, tagged(2)); // nested begin keeps the original base
    h = endGesture(h, tagged(9));
    expect(h.past).toHaveLength(1);
    expect(tag(h.past[0]!)).toBe(1);
  });

  it('records nothing for a gesture without change', () => {
    const b = tagged(1);
    const h = endGesture(beginGesture(emptyHistory, b), b);
    expect(h.past).toHaveLength(0);
    expect(h.pending).toBeNull();
  });

  it('keeps the current viewport on undo/redo', () => {
    const before = { ...tagged(1), viewport: { x: 0, y: 0, zoom: 1 } };
    const h = record(emptyHistory, before);
    const panned = { ...tagged(2), viewport: { x: 300, y: -40, zoom: 1.5 } };
    const u = undo(h, panned)!;
    expect(tag(u.board)).toBe(1);
    expect(u.board.viewport).toEqual(panned.viewport);
    const r = redo(u.history, u.board)!;
    expect(r.board.viewport).toEqual(panned.viewport);
  });
});
