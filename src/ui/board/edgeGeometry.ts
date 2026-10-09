import type { Rect } from '../../domain/layout/placement';

type Point = { x: number; y: number };

/** Where the line from `r`'s centre towards `towards` crosses `r`'s border. */
function borderPoint(r: Rect, towards: Point): Point {
  const c = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  const dx = towards.x - c.x;
  const dy = towards.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const t = Math.min(
    dx === 0 ? Infinity : r.width / 2 / Math.abs(dx),
    dy === 0 ? Infinity : r.height / 2 / Math.abs(dy),
  );
  return { x: c.x + dx * t, y: c.y + dy * t };
}

/** Floating edge ends: each on its section's border, along the centre-to-centre line (FR-017). */
export function attachPoints(source: Rect, target: Rect): { source: Point; target: Point } {
  const centre = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  return {
    source: borderPoint(source, centre(target)),
    target: borderPoint(target, centre(source)),
  };
}
