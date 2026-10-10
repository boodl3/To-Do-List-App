import { useState } from 'react';
import { sectionProgress, sectionRemaining } from '../../domain/rollup';
import type { Section } from '../../domain/schema';
import { titleFocusId } from '../../state/actions';
import { useActions, useFocusRequest } from '../app/useActions';
import { SegmentedProgress } from './SegmentedProgress';
import styles from './SectionHeader.module.css';

/** "1h 30m" with the leading unit large, as in the reference widgets. */
function Remaining({ minutes }: { minutes: number }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const [big, small] = h > 0 ? [`${h}h`, m > 0 ? ` ${m}m` : ''] : [`${m}m`, ''];
  return (
    <span className={`${styles.remaining} tabular-nums`}>
      <span className={styles.big}>{big}</span>
      {small}
      <span className={styles.unit}> left</span>
    </span>
  );
}

export function SectionHeader({ section, menu }: { section: Section; menu?: React.ReactNode }) {
  const actions = useActions();
  const titleRef = useFocusRequest<HTMLTextAreaElement>(titleFocusId(section.id));
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? section.title;
  const remaining = sectionRemaining(section);
  const progress = sectionProgress(section);

  const commit = () => {
    if (draft !== null) actions.renameSection(section.id, draft);
    setDraft(null);
  };

  return (
    <header className={`${styles.header} section-drag-handle`}>
      <div className={styles.titleRow}>
        <textarea
          ref={titleRef}
          rows={1}
          className={`${styles.title} nodrag`}
          value={value}
          placeholder="Untitled section"
          aria-label="Section title"
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.preventDefault();
              if (e.key === 'Escape') setDraft(null);
              e.currentTarget.blur();
            }
          }}
        />
        {menu}
      </div>
      {progress.total > 0 && (
        <div className={styles.stats}>
          {remaining > 0 ? (
            <Remaining minutes={remaining} />
          ) : (
            <span className={styles.remaining}>
              {progress.done === progress.total ? 'All done' : 'No estimates'}
            </span>
          )}
          <SegmentedProgress done={progress.done} total={progress.total} />
        </div>
      )}
    </header>
  );
}
