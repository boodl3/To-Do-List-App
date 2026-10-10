import { BOARD_GAP, MIN_SECTION } from '../defaults';
import type { Rect } from './placement';
import { snap } from './snap';

export interface TidyItem extends Rect {
  id: string;
  createdAt: number;
}

const BAND = MIN_SECTION.height / 2; // 80 px (data-model "Tidy-up")

/**
 * Reading order: sections whose top is within 80 px of a band's first section share a band;
 * bands go top to bottom, sections inside a band left to right; ties by creation time.
 */
export function readingOrder<T extends TidyItem>(items: readonly T[]): T[] {
  const byY = [...items].sort((a, b) => a.y - b.y || a.createdAt - b.createdAt);
  const bands: T[][] = [];
  for (const item of byY) {
    const band = bands.at(-1);
    if (band && item.y - band[0]!.y <= BAND) band.push(item);
    else bands.push([item]);
  }
  return bands.flatMap((band) => band.sort((a, b) => a.x - b.x || a.createdAt - b.createdAt));
}

/**
 * Tidy up (FR-005): rows left to right in reading order, wrapping past `rowWidth`, exactly the
 * standard gap between neighbours and rows. Sizes are kept; the layout starts at the
 * top-left of the current sections.
 */
export function tidy<T extends TidyItem>(items: readonly T[], rowWidth: number): T[] {
  if (items.length === 0) return [];
  const originX = snap(Math.min(...items.map((s) => s.x)));
  let y = snap(Math.min(...items.map((s) => s.y)));
  let x = originX;
  let rowHeight = 0;
  return readingOrder(items).map((s) => {
    if (x > originX && x + s.width > originX + rowWidth) {
      y += rowHeight + BOARD_GAP;
      x = originX;
      rowHeight = 0;
    }
    const placed = { ...s, x, y };
    x += s.width + BOARD_GAP;
    rowHeight = Math.max(rowHeight, s.height);
    return placed;
  });
}
