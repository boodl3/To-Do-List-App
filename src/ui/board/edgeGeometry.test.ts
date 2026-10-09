import { describe, expect, it } from 'vitest';
import { attachPoints } from './edgeGeometry';

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
