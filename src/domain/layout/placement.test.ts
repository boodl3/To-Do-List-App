import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOARD_GAP } from '../defaults';
import { findFreeSpot, intersects, type Rect } from './placement';

const size = { width: 320, height: 240 };
const viewport: Rect = { x: 0, y: 0, width: 1200, height: 800 };
const inflate = (r: Rect, d: number): Rect => ({
  x: r.x - d,
  y: r.y - d,
  width: r.width + 2 * d,
  height: r.height + 2 * d,
});

describe('findFreeSpot', () => {
  it('centres the first section in the viewport, on the grid', () => {
    expect(findFreeSpot([], size, viewport)).toEqual({ x: 440, y: 280 });
  });

  it('stays inside the viewport when there is room', () => {
    const taken = [{ x: 440, y: 280, ...size }];
    const p = findFreeSpot(taken, size, viewport);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.x + size.width).toBeLessThanOrEqual(viewport.width);
    expect(p.y + size.height).toBeLessThanOrEqual(viewport.height);
  });

  it('never overlaps and keeps the standard gap (property)', () => {
    const rect = fc.record({
      x: fc.integer({ min: -100, max: 140 }).map((v) => v * 8),
      y: fc.integer({ min: -100, max: 100 }).map((v) => v * 8),
      width: fc.integer({ min: 30, max: 60 }).map((v) => v * 8),
      height: fc.integer({ min: 20, max: 50 }).map((v) => v * 8),
    });
    fc.assert(
      fc.property(fc.array(rect, { maxLength: 30 }), (sections) => {
        const p = findFreeSpot(sections, size, viewport);
        expect(p.x % 8).toBe(0);
        expect(p.y % 8).toBe(0);
        const placed = inflate({ ...p, ...size }, BOARD_GAP);
        for (const s of sections) expect(intersects(placed, s)).toBe(false);
      }),
    );
  });
});
