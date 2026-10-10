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

type Side = 'top' | 'right' | 'bottom' | 'left';

const midpoint = (r: Rect, side: Side): Point => ({
  x: side === 'left' ? r.x : side === 'right' ? r.x + r.width : r.x + r.width / 2,
  y: side === 'top' ? r.y : side === 'bottom' ? r.y + r.height : r.y + r.height / 2,
});

/**
 * Curved edge ends: the midpoints of the sides facing each other, with those sides as bezier
 * directions, so a curved connection has the shape of the drag-to-connect preview.
 */
export function curveEnds(
  source: Rect,
  target: Rect,
): { source: Point & { position: Side }; target: Point & { position: Side } } {
  const dx = target.x + target.width / 2 - (source.x + source.width / 2);
  const dy = target.y + target.height / 2 - (source.y + source.height / 2);
  // Compare against the combined half sizes so wide sections still pick sides sensibly.
  const horizontal =
    Math.abs(dx) / (source.width + target.width) >= Math.abs(dy) / (source.height + target.height);
  const [from, to]: [Side, Side] = horizontal
    ? dx >= 0
      ? ['right', 'left']
      : ['left', 'right']
    : dy >= 0
      ? ['bottom', 'top']
      : ['top', 'bottom'];
  return {
    source: { ...midpoint(source, from), position: from },
    target: { ...midpoint(target, to), position: to },
  };
}
