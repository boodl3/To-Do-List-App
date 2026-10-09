import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type Edge,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react';
import { ArrowLeftRight, Minus, MoveRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useActions } from '../app/useActions';
import type { ConnectionEdgeData } from './adapters';
import styles from './ConnectionEdge.module.css';
import { attachPoints } from './edgeGeometry';

const rectOf = (n: InternalNode) => ({
  x: n.internals.positionAbsolute.x,
  y: n.internals.positionAbsolute.y,
  width: n.measured.width ?? n.width ?? 0,
  height: n.measured.height ?? n.height ?? 0,
});

function EdgeToolbar({ id, data }: { id: string; data: ConnectionEdgeData }) {
  const actions = useActions();
  const [label, setLabel] = useState(data.label);
  return (
    <div className={`${styles.toolbar} nodrag nopan`} role="toolbar" aria-label="Connection">
      <button
        type="button"
        aria-label="Arrow"
        aria-pressed={data.style === 'arrow'}
        onClick={() => {
          actions.restyleConnection(id, 'arrow');
        }}
      >
        <MoveRight size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Line"
        aria-pressed={data.style === 'line'}
        onClick={() => {
          actions.restyleConnection(id, 'line');
        }}
      >
        <Minus size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Reverse direction"
        onClick={() => {
          actions.reverseConnection(id);
        }}
      >
        <ArrowLeftRight size={16} aria-hidden />
      </button>
      <input
        aria-label="Label"
        placeholder="Label"
        maxLength={40}
        value={label}
        onChange={(e) => {
          setLabel(e.target.value);
        }}
        onBlur={() => {
          actions.labelConnection(id, label);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') actions.labelConnection(id, label);
        }}
      />
      <button
        type="button"
        aria-label="Delete connection"
        onClick={() => {
          actions.removeConnection(id);
        }}
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );
}

/** Floating edge between section borders; its toolbar appears when selected (FR-016, FR-017). */
export function ConnectionEdge({
  id,
  source,
  target,
  markerEnd,
  selected,
  data,
}: EdgeProps<Edge<ConnectionEdgeData>>) {
  const from = useInternalNode(source);
  const to = useInternalNode(target);
  if (!from || !to || !data) return null;
  const p = attachPoints(rectOf(from), rectOf(to));
  const [path, labelX, labelY] = getStraightPath({
    sourceX: p.source.x,
    sourceY: p.source.y,
    targetX: p.target.x,
    targetY: p.target.y,
  });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} />
      <EdgeLabelRenderer>
        <div
          className={styles.anchor}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {data.label && <span className={styles.label}>{data.label}</span>}
          {selected && <EdgeToolbar key={id} id={id} data={data} />}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
