import { GripVertical, Timer, X } from 'lucide-react';
import { useLayoutEffect, useState, type KeyboardEvent } from 'react';
import { formatEstimate } from '../../domain/estimate';
import type { Subtask, Task } from '../../domain/schema';
import { useActions, useFocusRequest } from '../app/useActions';
import { EstimateInput } from './EstimateInput';
import { useSortableRow } from './SortableList';
import styles from './TaskRow.module.css';

/** Grows a textarea to fit its content so long text wraps instead of scrolling. */
export function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export function TaskRow({
  sectionId,
  item,
  parentId,
  rollup,
  children,
}: {
  sectionId: string;
  item: Task | Subtask;
  /** Set for subtasks. */
  parentId?: string;
  /** Read-only sum shown instead of the estimate field when the task has subtasks. */
  rollup?: number;
  children?: React.ReactNode;
}) {
  const actions = useActions();
  const { setNodeRef, style, isDragging, handleProps } = useSortableRow(item.id);
  const textRef = useFocusRequest<HTMLTextAreaElement>(item.id);
  const [draft, setDraft] = useState<string | null>(null);
  // Row controls (grip, focus, delete) exist only while the row is hovered/focused: on a large
  // board they were most of the DOM (T117). Focusing into the row creates them before Tab moves on.
  const [active, setActive] = useState(false);
  const kind = parentId ? 'Subtask' : 'Task';
  const name = item.text || '(untitled)';
  const value = draft ?? item.text;

  useLayoutEffect(() => {
    autosize(textRef.current);
  }, [value, textRef]);

  const commitText = () => {
    if (draft !== null && draft !== item.text) actions.editText(sectionId, item.id, draft);
    setDraft(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const handled = () => {
      e.preventDefault();
      commitText();
    };
    if (e.key === 'Enter' && !e.shiftKey) {
      handled();
      if (parentId) actions.addSubtask(sectionId, parentId, item.id);
      else actions.addTask(sectionId, '', item.id);
    } else if (e.key === 'Tab' && !e.shiftKey && !parentId) {
      handled();
      actions.indent(sectionId, item.id);
    } else if (e.key === 'Tab' && e.shiftKey && parentId) {
      handled();
      actions.outdent(sectionId, item.id);
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      handled();
      actions.moveBy(sectionId, item.id, e.key === 'ArrowUp' ? -1 : 1);
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && value === '') {
      e.preventDefault();
      setDraft(null);
      actions.deleteItem(sectionId, item.id, { focusPrevious: true });
    } else if (e.key === 'Escape') {
      setDraft(null);
      e.currentTarget.blur();
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={styles.item}
      data-dragging={isDragging || undefined}
    >
      <div
        onMouseEnter={() => {
          setActive(true);
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.contains(document.activeElement)) setActive(false);
        }}
        onFocus={() => {
          setActive(true);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setActive(false);
        }}
        className={styles.row}
        data-subtask={parentId ? '' : undefined}
        data-done={item.done || undefined}
      >
        {(active || isDragging) && (
          <button
            type="button"
            className={`${styles.handle} nodrag`}
            aria-label={`Reorder ${name}`}
            {...handleProps}
          >
            <GripVertical size={14} aria-hidden />
          </button>
        )}
        <input
          type="checkbox"
          className={`${styles.check} nodrag`}
          checked={item.done}
          aria-label={`Done: ${name}`}
          onChange={() => {
            actions.toggleDone(sectionId, item.id);
          }}
        />
        <textarea
          ref={textRef}
          rows={1}
          className={`${styles.text} nodrag`}
          value={value}
          placeholder={parentId ? 'Subtask' : 'Task'}
          aria-label={`${kind} ${name}`}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={commitText}
          onKeyDown={onKeyDown}
        />
        {rollup !== undefined ? (
          <span className={`${styles.rollup} tabular-nums`} title="Sum of subtasks">
            {formatEstimate(rollup) || '—'}
          </span>
        ) : (
          <EstimateInput
            value={item.estimateMin}
            label={`Estimate for ${name}`}
            onCommit={(m) => {
              actions.setEstimate(sectionId, item.id, m);
            }}
          />
        )}
        {active && (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.delete} nodrag`}
              aria-label={`Focus on ${name}`}
              title="Focus on this with the timer"
              onClick={() => {
                actions.focusOn(item.id);
              }}
            >
              <Timer size={14} aria-hidden />
            </button>
            <button
              type="button"
              className={`${styles.delete} nodrag`}
              aria-label={`Delete ${name}`}
              onClick={() => {
                actions.deleteItem(sectionId, item.id);
              }}
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        )}
      </div>
      {children}
    </li>
  );
}
