import { describe, expect, it } from 'vitest';
import { snap, snapRect } from './snap';

describe('snap', () => {
  it.each([
    [0, 0],
    [3, 0],
    [4, 8],
    [12, 16],
    [-3, 0],
    [-5, -8],
    [-12, -8],
    [101.9, 104],
  ])('snaps %d to %d', (v, out) => {
    expect(snap(v)).toBe(out);
  });

  it('never returns negative zero', () => {
    expect(Object.is(snap(-1), 0)).toBe(true);
  });
});

describe('snapRect', () => {
  it('snaps every side and enforces the minimum size', () => {
    expect(snapRect({ x: 3, y: 13, width: 301, height: 50 })).toEqual({
      x: 0,
      y: 16,
      width: 304,
      height: 160,
    });
    expect(snapRect({ x: 0, y: 0, width: 100, height: 400 }).width).toBe(240);
  });
});
