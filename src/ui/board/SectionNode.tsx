import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { memo, useState } from 'react';
import { MIN_SECTION } from '../../domain/defaults';
import { isImage, isNote, sectionName } from '../../domain/sections';
import { useApp } from '../../state/selectors';
import { useActions } from '../app/useActions';
import { NoteEditor } from '../section/NoteEditor';
import { SectionHeader } from '../section/SectionHeader';
import { SectionMenu } from '../section/SectionMenu';
import { TaskList } from '../section/TaskList';
import { customAccentStyle } from '../theme/customAccent';
import { cornerTone } from './imageFile';
import styles from './SectionNode.module.css';

export const SectionNode = memo(function SectionNode({ id, selected }: NodeProps) {
  const section = useApp((s) => s.doc.board.sections.find((x) => x.id === id));
  const actions = useActions();
  // Picture brightness under the options button, so its icon stays visible (image cards only).
  const [tone, setTone] = useState<'light' | 'dark' | null>(null);
  if (!section) return null;
  return (
    <>
      <NodeResizer
        isVisible={selected}
        keepAspectRatio={isImage(section)}
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
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((p) => (
        <Handle key={p} id={p} type="source" position={p} className={styles.handle} />
      ))}
      <div
        className={`${styles.card} ${section.image ? styles.imageCard : ''}`}
        data-accent={section.accent}
        style={customAccentStyle(section.accent)}
        role="group"
        aria-label={sectionName(section)}
      >
        {section.image ? (
          <>
            <div className={styles.imageMenu} data-tone={tone ?? undefined}>
              <SectionMenu section={section} />
            </div>
            <img
              className={`${styles.picture} section-drag-handle`}
              src={section.image.src}
              alt={section.title || 'Image'}
              draggable={false}
              onLoad={(e) => {
                setTone(cornerTone(e.currentTarget));
              }}
            />
          </>
        ) : (
          <>
            <SectionHeader section={section} menu={<SectionMenu section={section} />} />
            {isNote(section) ? (
              <NoteEditor section={section} bodyClassName={`${styles.body} nowheel`} />
            ) : (
              <div className={`${styles.body} nowheel`}>
                <TaskList section={section} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
});
