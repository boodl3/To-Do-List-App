import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { Connection, Section } from '../../domain/schema';

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
    if (!old) return n;
    // Mid-drag the live position wins over the store (which only updates on drop).
    const live = old.dragging ? { position: old.position, dragging: true } : {};
    return { ...n, measured: old.measured, selected: old.selected, ...live };
  });
}

export interface ConnectionEdgeData extends Record<string, unknown> {
  label: string;
  style: Connection['style'];
  shape: Connection['shape'];
}

export function toEdges(connections: readonly Connection[], selectedId: string | null): Edge[] {
  return connections.map((c) => ({
    id: c.id,
    source: c.from,
    target: c.to,
    type: 'connection',
    selected: c.id === selectedId,
    markerEnd:
      c.style === 'arrow' ? { type: MarkerType.ArrowClosed, width: 18, height: 18 } : undefined,
    data: { label: c.label, style: c.style, shape: c.shape } satisfies ConnectionEdgeData,
  }));
}
