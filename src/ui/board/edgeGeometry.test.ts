import { describe, expect, it } from 'vitest';
import { attachPoints, curveEnds } from './edgeGeometry';

const a = { x: 0, y: 0, width: 200, height: 100 }; // centre (100, 50)

describe('attachPoints', () => {
  it('leaves through the right edge towards a section on the right', () => {
    const b = { x: 400, y: 0, width: 200, height: 100 };
    expect(attachPoints(a, b)).toEqual({ source: { x: 200, y: 50 }, target: { x: 400, y: 50 } });
  });

  it('leaves through the bottom edge towards a section below', () => {
    const b = { x: 0, y: 300, width: 200, height: 100 };
    expect(attachPoints(a, b)).toEqual({ source: { x: 100, y: 100 }, target: { x: 100, y: 300 } });
  });

  it('works to the left and above', () => {
    const b = { x: -400, y: -300, width: 200, height: 100 };
    const { source, target } = attachPoints(a, b);
    expect(source.y).toBe(0); // top edge of a
    expect(target.y).toBe(-200); // bottom edge of b
  });

  it('falls back to the centres when the sections overlap exactly', () => {
    expect(attachPoints(a, a)).toEqual({ source: { x: 100, y: 50 }, target: { x: 100, y: 50 } });
  });
});

describe('curveEnds', () => {
  it('uses the facing side midpoints, like handles: right → left for a section to the right', () => {
    const b = { x: 400, y: 200, width: 200, height: 100 };
    expect(curveEnds(a, b)).toEqual({
      source: { x: 200, y: 50, position: 'right' },
      target: { x: 400, y: 250, position: 'left' },
    });
  });

  it('bottom → top for a section mostly below', () => {
    const b = { x: 50, y: 300, width: 200, height: 100 };
    expect(curveEnds(a, b)).toEqual({
      source: { x: 100, y: 100, position: 'bottom' },
      target: { x: 150, y: 300, position: 'top' },
    });
  });

  it('left ← right and top ↑ bottom the other way round', () => {
    expect(curveEnds(a, { x: -500, y: 0, width: 200, height: 100 }).source.position).toBe('left');
    expect(curveEnds(a, { x: 0, y: -400, width: 200, height: 100 }).source.position).toBe('top');
  });
});
