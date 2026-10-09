import type { KeyboardEvent, ReactNode } from 'react';
import { MoreHorizontal, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useApp, useCanRedo, useCanUndo } from '../../state/selectors';
import styles from './Toolbar.module.css';

/** Arrow keys move focus between enabled toolbar buttons (in addition to normal Tab order). */
function onArrowKeys(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const buttons = [
    ...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  ].filter((b) => b.getClientRects().length > 0); // skip controls hidden on narrow windows
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

/** Narrow windows: secondary controls move into this popover (spec Edge Case "Tiny window"). */
function MoreMenu({ children }: { children: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onToggle = (e: Event) => {
      setOpen((e as ToggleEvent).newState === 'open');
    };
    el.addEventListener('toggle', onToggle);
    return () => {
      el.removeEventListener('toggle', onToggle);
    };
  }, []);
  return (
    <span className={styles.more}>
      <button
        type="button"
        className={styles.button}
        aria-label="More"
        title="More"
        popoverTarget={id}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      <div ref={ref} id={id} popover="auto" className={styles.menu} role="dialog" aria-label="More">
        {open && children}
      </div>
    </span>
  );
}

export function Toolbar({
  start,
  end,
  overflow,
}: {
  start?: ReactNode;
  end?: ReactNode;
  /** Shown inline on wide windows, behind "More" on narrow ones. */
  overflow?: ReactNode;
}) {
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
        {overflow && <div className={styles.wide}>{overflow}</div>}
        {overflow && <MoreMenu>{overflow}</MoreMenu>}
        {end}
      </div>
    </div>
  );
}
