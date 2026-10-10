import { describe, expect, it } from 'vitest';
import { findGuides } from './guides';

const other = { x: 0, y: 0, width: 320, height: 240 };
const size = { width: 200, height: 160 };

describe('findGuides', () => {
  it('aligns left edges within the threshold', () => {
    const r = findGuides({ x: 4, y: 400, ...size }, [other], 6);
    expect(r.x).toBe(0);
    expect(r.y).toBe(400);
    expect(r.guides).toContainEqual(expect.objectContaining({ axis: 'x', at: 0 }));
  });

  it('aligns centres and right edges', () => {
    expect(findGuides({ x: 57, y: 400, ...size }, [other], 6).x).toBe(60); // centre 160
    expect(findGuides({ x: 118, y: 400, ...size }, [other], 6).x).toBe(120); // right 320
  });

  it('snaps to the standard 24 px gap on either side', () => {
    expect(findGuides({ x: 347, y: 0, ...size }, [other], 6).x).toBe(344); // right of other
    expect(findGuides({ x: 400, y: 260, ...size }, [other], 6).y).toBe(264); // below other
    expect(findGuides({ x: -221, y: 0, ...size }, [other], 6).x).toBe(-224); // left of other
  });

  it('does nothing outside the threshold', () => {
    const r = findGuides({ x: 30, y: 500, ...size }, [other], 6);
    expect(r).toEqual({ x: 30, y: 500, guides: [] });
  });

  it('picks the closest candidate per axis', () => {
    const a = { x: 0, y: 0, width: 240, height: 160 };
    const b = { x: 9, y: 600, width: 240, height: 160 };
    expect(findGuides({ x: 7, y: 300, ...size }, [a, b], 6).x).toBe(9);
  });
});
