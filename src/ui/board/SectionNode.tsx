import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useApp } from '../../state/selectors';
import { SectionHeader } from '../section/SectionHeader';
import { TaskList } from '../section/TaskList';
import styles from './SectionNode.module.css';

export const SectionNode = memo(function SectionNode({ id }: NodeProps) {
  const section = useApp((s) => s.doc.board.sections.find((x) => x.id === id));
  if (!section) return null;
  return (
    <div
      className={styles.card}
      data-accent={section.accent}
      role="group"
      aria-label={section.title || 'Untitled section'}
    >
      <SectionHeader section={section} />
      <div className={`${styles.body} nowheel`}>
        <TaskList section={section} />
      </div>
    </div>
  );
});
