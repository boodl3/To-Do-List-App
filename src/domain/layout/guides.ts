import { BOARD_GAP } from '../defaults';
import type { Rect } from './placement';

/** A guide line in board units: vertical (`axis: 'x'`) at x = `at`, spanning `from`–`to` in y. */
export interface Guide {
  axis: 'x' | 'y';
  at: number;
  from: number;
  to: number;
}

type Axis = { pos: 'x' | 'y'; size: 'width' | 'height' };
const X: Axis = { pos: 'x', size: 'width' };
const Y: Axis = { pos: 'y', size: 'height' };

/**
 * Best snap along one axis (FR-004): the moving rect's start/centre/end aligned with a
 * neighbour's start/centre/end, or sitting the standard gap before/after it.
 */
function bestOnAxis(moving: Rect, others: Rect[], threshold: number, a: Axis, b: Axis) {
  let best: { delta: number; line: number; other: Rect } | null = null;
  const len = moving[a.size];
  for (const o of others) {
    const oStart = o[a.pos];
    const oEnd = oStart + o[a.size];
    const oMid = oStart + o[a.size] / 2;
    // [target position for moving.start, line to draw]
    const candidates: [number, number][] = [
      [oStart, oStart],
      [oMid - len / 2, oMid],
      [oEnd - len, oEnd],
      [oEnd + BOARD_GAP, oEnd + BOARD_GAP], // standard gap after
      [oStart - BOARD_GAP - len, oStart - BOARD_GAP], // standard gap before
    ];
    for (const [target, line] of candidates) {
      const delta = target - moving[a.pos];
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, line, other: o };
      }
    }
  }
  if (!best) return null;
  const { other } = best;
  const from = Math.min(moving[b.pos], other[b.pos]);
  const to = Math.max(moving[b.pos] + moving[b.size], other[b.pos] + other[b.size]);
  return { value: moving[a.pos] + best.delta, guide: { axis: a.pos, at: best.line, from, to } };
}

export function findGuides(
  moving: Rect,
  others: Rect[],
  threshold: number,
): { x: number; y: number; guides: Guide[] } {
  const bx = bestOnAxis(moving, others, threshold, X, Y);
  const by = bestOnAxis(moving, others, threshold, Y, X);
  return {
    x: bx?.value ?? moving.x,
    y: by?.value ?? moving.y,
    guides: [bx?.guide, by?.guide].filter((g): g is Guide => g !== undefined),
  };
}
