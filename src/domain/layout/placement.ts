import { BOARD_GAP, GRID } from '../defaults';
import { snap } from './snap';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True when the rects overlap; touching edges do not count. */
export const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const STEP = GRID * 3;

/**
 * Nearest free spot for a new section (FR-006): candidates on the grid, ring by ring outward from
 * the viewport centre; the first one fully inside the viewport and at least the standard gap
 * from every section wins. Falls back to the right of everything.
 */
export function findFreeSpot(
  sections: readonly Rect[],
  size: { width: number; height: number },
  viewport: Rect,
): { x: number; y: number } {
  const cx = snap(viewport.x + viewport.width / 2 - size.width / 2);
  const cy = snap(viewport.y + viewport.height / 2 - size.height / 2);
  const free = (x: number, y: number) => {
    const r = {
      x: x - BOARD_GAP,
      y: y - BOARD_GAP,
      width: size.width + 2 * BOARD_GAP,
      height: size.height + 2 * BOARD_GAP,
    };
    return sections.every((s) => !intersects(r, s));
  };
  const inView = (x: number, y: number) =>
    x >= viewport.x &&
    y >= viewport.y &&
    x + size.width <= viewport.x + viewport.width &&
    y + size.height <= viewport.y + viewport.height;

  // ponytail: O(rings² × sections); fine for the 500-section cap, index sections if it isn't.
  const rings = Math.ceil(Math.max(viewport.width, viewport.height) / STEP);
  for (let r = 0; r <= rings; r++) {
    const ring: { x: number; y: number }[] = [];
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) === r)
          ring.push({ x: cx + i * STEP, y: cy + j * STEP });
      }
    }
    ring.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    const hit = ring.find((p) => inView(p.x, p.y) && free(p.x, p.y));
    if (hit) return hit;
  }
  const right = Math.max(...sections.map((s) => s.x + s.width));
  return { x: Math.ceil((right + BOARD_GAP) / GRID) * GRID, y: cy };
}
