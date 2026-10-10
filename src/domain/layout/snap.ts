import { GRID, MIN_SECTION } from '../defaults';
import type { Rect } from './placement';

/** Round to the 8 px grid (FR-003). `+ 0` turns -0 into 0. */
export const snap = (v: number, grid = GRID): number => Math.round(v / grid) * grid + 0;

export function snapRect(r: Rect): Rect {
  return {
    x: snap(r.x),
    y: snap(r.y),
    width: Math.max(MIN_SECTION.width, snap(r.width)),
    height: Math.max(MIN_SECTION.height, snap(r.height)),
  };
}
