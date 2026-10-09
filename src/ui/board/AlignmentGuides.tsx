import { ViewportPortal } from '@xyflow/react';
import type { Guide } from '../../domain/layout/guides';
import styles from './AlignmentGuides.module.css';

/** Guide lines drawn in board coordinates while a section is dragged (FR-004). */
export function AlignmentGuides({ guides }: { guides: Guide[] }) {
  return (
    <ViewportPortal>
      {guides.map((g) => (
        <div
          key={g.axis}
          className={styles.guide}
          data-axis={g.axis}
          style={
            g.axis === 'x'
              ? { left: g.at, top: g.from, height: g.to - g.from }
              : { top: g.at, left: g.from, width: g.to - g.from }
          }
        />
      ))}
    </ViewportPortal>
  );
}
