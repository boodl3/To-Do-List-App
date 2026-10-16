import { useEffect, useRef } from 'react';
import { isImage, isNote, sectionName } from '../../domain/sections';
import { useApp } from '../../state/selectors';
import { useActions } from '../app/useActions';
import styles from '../app/App.module.css';

/** Confirmation before deleting a section that still has tasks, or a note with text (FR-007). */
export function ConfirmDeleteDialog() {
  const actions = useActions();
  const section = useApp((s) => s.doc.board.sections.find((x) => x.id === s.confirmDeleteId));
  const cancel = useApp((s) => s.setConfirmDelete);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (section) ref.current?.showModal();
    else ref.current?.close();
  }, [section]);

  const title = section ? sectionName(section) : '';
  const count = section?.tasks.length ?? 0;
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirm-delete-title"
      onClose={() => {
        cancel(null);
      }}
    >
      <h2 id="confirm-delete-title">Delete "{title}"?</h2>
      <p>
        {section && isImage(section)
          ? 'Its picture will be deleted.'
          : section && isNote(section)
            ? 'Its text will be deleted.'
            : `It has ${count} ${count === 1 ? 'task' : 'tasks'}.`}{' '}
        You can undo this with Ctrl+Z.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          autoFocus
          onClick={() => ref.current?.close()}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            if (section) actions.deleteSection(section.id);
          }}
        >
          Delete
        </button>
      </div>
    </dialog>
  );
}
