import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOARD_GAP } from '../defaults';
import { intersects } from './placement';
import { readingOrder, tidy, type TidyItem } from './tidy';

const item = (id: string, x: number, y: number, w = 240, h = 160, createdAt = 0): TidyItem => ({
  id,
  x,
  y,
  width: w,
  height: h,
  createdAt,
});

describe('readingOrder', () => {
  it('puts sections whose tops are within 80 px in one band, ordered by x', () => {
    const order = readingOrder([item('b', 300, 72), item('a', 0, 0), item('c', 0, 88)]);
    expect(order.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties by createdAt', () => {
    const order = readingOrder([item('late', 0, 0, 240, 160, 2), item('early', 0, 0, 240, 160, 1)]);
    expect(order.map((s) => s.id)).toEqual(['early', 'late']);
  });
});

describe('tidy', () => {
  it('lays out rows left to right and wraps at the row width', () => {
    const out = tidy([item('a', 0, 0), item('b', 500, 10), item('c', 20, 400, 240, 200)], 600);
    expect(out.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 264, y: 0 },
      { id: 'c', x: 0, y: 184 },
    ]);
  });

  it('keeps sizes, removes overlaps, and uses exactly the standard gap (SC-006)', () => {
    const arb = fc.array(
      fc.record({
        x: fc.integer({ min: -50, max: 200 }).map((v) => v * 8),
        y: fc.integer({ min: -50, max: 200 }).map((v) => v * 8),
        w: fc.integer({ min: 30, max: 80 }).map((v) => v * 8),
        h: fc.integer({ min: 20, max: 60 }).map((v) => v * 8),
        c: fc.nat(1000),
      }),
      { maxLength: 25 },
    );
    fc.assert(
      fc.property(
        arb,
        fc.integer({ min: 100, max: 300 }).map((v) => v * 8),
        (raw, width) => {
          const input = raw.map((r, i) => item(`s${i}`, r.x, r.y, r.w, r.h, r.c));
          const out = tidy(input, width);
          expect(out.map((s) => s.id)).toEqual(readingOrder(input).map((s) => s.id));
          out.forEach((s) => {
            const src = input.find((i) => i.id === s.id)!;
            expect([s.width, s.height]).toEqual([src.width, src.height]);
          });
          for (let i = 0; i < out.length; i++) {
            for (let j = i + 1; j < out.length; j++)
              expect(intersects(out[i]!, out[j]!)).toBe(false);
          }
          const rows = [...new Set(out.map((s) => s.y))].sort((a, b) => a - b);
          rows.forEach((y, r) => {
            const row = out.filter((s) => s.y === y);
            for (let k = 1; k < row.length; k++) {
              expect(row[k]!.x - (row[k - 1]!.x + row[k - 1]!.width)).toBe(BOARD_GAP);
            }
            if (r > 0) {
              const prev = out.filter((s) => s.y === rows[r - 1]);
              expect(y - (rows[r - 1]! + Math.max(...prev.map((s) => s.height)))).toBe(BOARD_GAP);
            }
          });
        },
      ),
    );
  });
});
