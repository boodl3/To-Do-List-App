import { Plus } from 'lucide-react';
import styles from './EmptyBoard.module.css';

export function EmptyBoard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>Your board is empty</p>
      <p className={styles.hint}>Create a section to start collecting tasks.</p>
      <button type="button" className={styles.button} onClick={onAdd}>
        <Plus size={18} aria-hidden /> New section
      </button>
    </div>
  );
}
