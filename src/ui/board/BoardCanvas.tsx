import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { useState } from 'react';
import { GRID } from '../../domain/defaults';
import { useBoard } from '../../state/selectors';
import { useResolvedTheme } from '../theme/useResolvedTheme';
import { mergeNodes, toNodes } from './adapters';
import { SectionNode } from './SectionNode';

const nodeTypes = { section: SectionNode };

export function BoardCanvas() {
  const board = useBoard();
  const theme = useResolvedTheme();
  const [nodes, setNodes] = useState<Node[]>(() => toNodes(board.sections));
  const [synced, setSynced] = useState(board.sections);
  // Store → nodes, adjusted during render (react.dev "you might not need an effect").
  if (synced !== board.sections) {
    setSynced(board.sections);
    setNodes((prev) => mergeNodes(toNodes(board.sections), prev));
  }

  return (
    <ReactFlow
      nodes={nodes}
      onNodesChange={(changes: NodeChange[]) => {
        setNodes((n) => applyNodeChanges(changes, n));
      }}
      nodeTypes={nodeTypes}
      colorMode={theme}
      defaultViewport={board.viewport}
      minZoom={0.25}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      deleteKeyCode={null}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={GRID * 3} size={1.5} />
    </ReactFlow>
  );
}
