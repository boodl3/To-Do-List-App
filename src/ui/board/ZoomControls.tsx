import { Panel, useReactFlow, useViewport } from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { IconButton } from '../toolbar/Toolbar';
import styles from './ZoomControls.module.css';

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  return (
    <Panel position="bottom-right" className={styles.panel} aria-label="Zoom">
      <IconButton
        label="Zoom out"
        onClick={() => {
          void zoomOut();
        }}
      >
        <Minus size={16} aria-hidden />
      </IconButton>
      <span className={`${styles.level} tabular-nums`} data-testid="zoom-level" aria-live="polite">
        {Math.round(zoom * 100)}%
      </span>
      <IconButton
        label="Zoom in"
        onClick={() => {
          void zoomIn();
        }}
      >
        <Plus size={16} aria-hidden />
      </IconButton>
      <IconButton
        label="Fit all"
        onClick={() => {
          void fitView({ padding: 0.1, maxZoom: 1 });
        }}
      >
        <Maximize size={16} aria-hidden />
      </IconButton>
    </Panel>
  );
}
