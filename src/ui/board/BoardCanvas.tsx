import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { canConnect } from '../../domain/connections';
import { BOARD_GAP, GRID } from '../../domain/defaults';
import { findGuides, type Guide } from '../../domain/layout/guides';
import { snap } from '../../domain/layout/snap';
import { useApp, useBoard } from '../../state/selectors';
import { isTextEntry } from '../app/shortcuts';
import { useActions } from '../app/useActions';
import { useResolvedTheme } from '../theme/useResolvedTheme';
import { mergeNodes, toEdges, toNodes } from './adapters';
import { ConnectionEdge } from './ConnectionEdge';
import { AlignmentGuides } from './AlignmentGuides';
import { SectionNode } from './SectionNode';
import { ZoomControls } from './ZoomControls';

const nodeTypes = { section: SectionNode };
const edgeTypes = { connection: ConnectionEdge };
const GUIDE_THRESHOLD_PX = 6;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Tracks the Alt key, which bypasses snapping (FR-003). */
function useAltKey() {
  const alt = useRef(false);
  useEffect(() => {
    const track = (e: KeyboardEvent | PointerEvent) => {
      alt.current = e.altKey;
    };
    window.addEventListener('keydown', track);
    window.addEventListener('keyup', track);
    window.addEventListener('pointermove', track);
    return () => {
      window.removeEventListener('keydown', track);
      window.removeEventListener('keyup', track);
      window.removeEventListener('pointermove', track);
    };
  }, []);
  return alt;
}

/**
 * Arrow keys move the focused section; Ctrl/Cmd+arrows resize; Delete removes it.
 * Delete/Backspace also removes the selected connection.
 */
function useSectionKeyboard(selectedEdge: string | null) {
  const actions = useActions();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedEdge && (e.key === 'Delete' || e.key === 'Backspace') && !isTextEntry(e.target)) {
        actions.removeConnection(selectedEdge);
        e.preventDefault();
        return;
      }
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !el.classList.contains('react-flow__node')) return;
      if (isTextEntry(e.target)) return;
      const id = el.dataset.id;
      if (!id) return;
      const dir = ARROWS[e.key];
      if (dir) {
        const step = e.shiftKey ? BOARD_GAP : GRID;
        actions.nudgeSection(id, dir[0] * step, dir[1] * step, { resize: e.ctrlKey || e.metaKey });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        actions.requestDeleteSection(id);
      } else {
        return;
      }
      // Capture phase: keep React Flow's own arrow-key handling from moving it a second time.
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
    };
  }, [actions, selectedEdge]);
}

export function BoardCanvas() {
  const board = useBoard();
  const theme = useResolvedTheme();
  const actions = useActions();
  const zoom = useApp((s) => s.doc.board.viewport.zoom);
  const alt = useAltKey();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [nodes, setNodes] = useState<Node[]>(() => toNodes(board.sections));
  const [synced, setSynced] = useState(board.sections);
  // Store → nodes, adjusted during render (react.dev "you might not need an effect").
  if (synced !== board.sections) {
    setSynced(board.sections);
    setNodes((prev) => mergeNodes(toNodes(board.sections), prev));
  }
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const edges = useMemo(
    () => toEdges(board.connections, selectedEdge),
    [board.connections, selectedEdge],
  );
  useSectionKeyboard(selectedEdge);

  const onEdgesChange = (changes: EdgeChange[]) => {
    for (const c of changes) {
      if (c.type === 'select')
        setSelectedEdge((cur) => (c.selected ? c.id : cur === c.id ? null : cur));
    }
  };

  /** Grid snap, then neighbours' guides (FR-003, FR-004); Alt bypasses both. */
  const place = (id: string, raw: { x: number; y: number }) => {
    const self = board.sections.find((s) => s.id === id);
    if (alt.current || !self) return { ...raw, guides: [] };
    const moving = { ...self, x: snap(raw.x), y: snap(raw.y) };
    const others = board.sections.filter((s) => s.id !== id);
    return findGuides(moving, others, GUIDE_THRESHOLD_PX / zoom);
  };

  const onNodesChange = (changes: NodeChange[]) => {
    const adjusted = changes.map((c) => {
      if (c.type !== 'position' || !c.dragging || !c.position) return c;
      const p = place(c.id, c.position);
      setGuides(p.guides);
      return { ...c, position: { x: p.x, y: p.y } };
    });
    setNodes((n) => applyNodeChanges(adjusted, n));
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={({ source, target }) => {
        actions.connect(source, target);
      }}
      isValidConnection={({ source, target }) => canConnect(board, source, target)}
      connectionMode={ConnectionMode.Loose}
      edgeTypes={edgeTypes}
      onNodeDragStart={(_, node) => {
        actions.startGesture(node.id);
      }}
      onNodeDragStop={(_, node) => {
        // React Flow reports its raw drag position here, so apply the same placement again.
        const p = place(node.id, node.position);
        actions.moveSection(node.id, p.x, p.y);
        actions.endGesture();
        setGuides([]);
      }}
      onMoveEnd={(_, viewport) => {
        actions.setViewport(viewport);
      }}
      nodeTypes={nodeTypes}
      colorMode={theme}
      defaultViewport={board.viewport}
      minZoom={0.25}
      maxZoom={2}
      panOnDrag={[0, 1]}
      panOnScroll
      panActivationKeyCode="Space"
      zoomActivationKeyCode={['Control', 'Meta']}
      selectionOnDrag={false}
      deleteKeyCode={null}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={GRID * 3} size={1.5} />
      <AlignmentGuides guides={guides} />
      <ZoomControls />
    </ReactFlow>
  );
}
