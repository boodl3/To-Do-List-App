import { NodeResizer, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { MIN_SECTION } from '../../domain/defaults';
import { useApp } from '../../state/selectors';
import { useActions } from '../app/useActions';
import { SectionHeader } from '../section/SectionHeader';
import { SectionMenu } from '../section/SectionMenu';
import { TaskList } from '../section/TaskList';
import styles from './SectionNode.module.css';

export const SectionNode = memo(function SectionNode({ id, selected }: NodeProps) {
  const section = useApp((s) => s.doc.board.sections.find((x) => x.id === id));
  const actions = useActions();
  if (!section) return null;
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_SECTION.width}
        minHeight={MIN_SECTION.height}
        onResizeStart={() => {
          actions.startGesture(id);
        }}
        onResizeEnd={(event, rect) => {
          const alt = (event.sourceEvent as MouseEvent | undefined)?.altKey ?? false;
          actions.resizeSection(id, rect, { snap: !alt });
          actions.endGesture();
        }}
      />
      <div
        className={styles.card}
        data-accent={section.accent}
        role="group"
        aria-label={section.title || 'Untitled section'}
      >
        <SectionHeader section={section} menu={<SectionMenu section={section} />} />
        <div className={`${styles.body} nowheel`}>
          <TaskList section={section} />
        </div>
      </div>
    </>
  );
});
