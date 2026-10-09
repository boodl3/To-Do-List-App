import type { Node } from '@xyflow/react';
import type { Section } from '../../domain/schema';

/** The only place domain sections become React Flow nodes (Constitution III). */
export function toNodes(sections: readonly Section[]): Node[] {
  return sections.map((s, i) => ({
    id: s.id,
    type: 'section',
    position: { x: s.x, y: s.y },
    width: s.width,
    height: s.height,
    zIndex: i,
    dragHandle: '.section-drag-handle',
    data: {},
  }));
}

/** Keep React Flow's own bookkeeping (measured size, selection) across store updates. */
export function mergeNodes(next: Node[], prev: Node[]): Node[] {
  const byId = new Map(prev.map((n) => [n.id, n]));
  return next.map((n) => {
    const old = byId.get(n.id);
    return old ? { ...n, measured: old.measured, selected: old.selected } : n;
  });
}
