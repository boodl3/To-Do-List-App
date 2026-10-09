import type { KeyboardEvent, ReactNode } from 'react';
import { Redo2, Undo2 } from 'lucide-react';
import { useApp, useCanRedo, useCanUndo } from '../../state/selectors';
import styles from './Toolbar.module.css';

/** Arrow keys move focus between enabled toolbar buttons (in addition to normal Tab order). */
function onArrowKeys(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (i === -1) return;
  const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
  next?.focus();
  e.preventDefault();
}

export function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Toolbar({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  const undo = useApp((s) => s.undo);
  const redo = useApp((s) => s.redo);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Board" onKeyDown={onArrowKeys}>
      <div className={styles.group}>{start}</div>
      <div className={styles.group}>
        <IconButton label="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 size={18} aria-hidden />
        </IconButton>
        <IconButton label="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 size={18} aria-hidden />
        </IconButton>
        {end}
      </div>
    </div>
  );
}
