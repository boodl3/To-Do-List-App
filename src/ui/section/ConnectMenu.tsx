import { ArrowRight } from 'lucide-react';
import { canConnect } from '../../domain/connections';
import { sectionName } from '../../domain/sections';
import { useBoard } from '../../state/selectors';
import { useActions } from '../app/useActions';
import styles from './SectionMenu.module.css';

/** Keyboard path to create a connection (Constitution IV): "Connect to…" each other section. */
export function ConnectMenu({ sectionId, onDone }: { sectionId: string; onDone: () => void }) {
  const board = useBoard();
  const actions = useActions();
  const others = board.sections.filter((s) => s.id !== sectionId);
  if (others.length === 0) return null;
  return (
    <>
      <hr className={styles.divider} />
      <div className={styles.group}>
        <span className={styles.legend}>Connect to</span>
        {others.map((s) => {
          const title = sectionName(s);
          return (
            <button
              key={s.id}
              type="button"
              className={styles.item}
              aria-label={`Connect to ${title}`}
              disabled={!canConnect(board, sectionId, s.id)}
              onClick={() => {
                actions.connect(sectionId, s.id);
                onDone();
              }}
            >
              <ArrowRight size={16} aria-hidden /> {title}
            </button>
          );
        })}
      </div>
    </>
  );
}
