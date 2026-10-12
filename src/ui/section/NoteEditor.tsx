import { Bold, Italic, List, ListOrdered, Strikethrough, Underline } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Section } from '../../domain/schema';
import { useActions } from '../app/useActions';
import { sanitizeNote } from './noteHtml';
import styles from './NoteEditor.module.css';

const TOOLS = [
  { command: 'bold', label: 'Bold (Ctrl+B)', Icon: Bold },
  { command: 'italic', label: 'Italic (Ctrl+I)', Icon: Italic },
  { command: 'underline', label: 'Underline (Ctrl+U)', Icon: Underline },
  { command: 'strikeThrough', label: 'Strikethrough', Icon: Strikethrough },
  { command: 'insertUnorderedList', label: 'Bulleted list', Icon: List },
  { command: 'insertOrderedList', label: 'Numbered list', Icon: ListOrdered },
] as const;

/*
 * ponytail: the browser's built-in rich-text editing (execCommand) instead of an editor library.
 * It's deprecated but supported by every engine Tauri ships (WebView2, WKWebView, WebKitGTK).
 * Move to Lexical or Tiptap if it ever goes away, or for links, headings or checklists.
 */
/* eslint-disable @typescript-eslint/no-deprecated */
const exec = (command: string) => document.execCommand(command);
const isOn = (command: string) => document.queryCommandState(command);
/* eslint-enable @typescript-eslint/no-deprecated */

/** A note's rich-text body (inside the card's scroller, `bodyClassName`) and its formatting bar. */
export function NoteEditor({
  section,
  bodyClassName,
}: {
  section: Section;
  bodyClassName: string;
}) {
  const actions = useActions();
  const ref = useRef<HTMLDivElement>(null);
  /** The last HTML this editor saved, so its own edits aren't written back over the caret. */
  const saved = useRef<string | null>(null);
  const [active, setActive] = useState('');
  const note = section.note ?? '';

  // Store → editor on mount and for outside changes (undo/redo).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || note === saved.current) return;
    el.innerHTML = sanitizeNote(note);
    saved.current = note;
  }, [note]);

  // Toolbar buttons show the formatting at the caret.
  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el?.contains(document.getSelection()?.anchorNode ?? null)) return;
      setActive(
        TOOLS.filter((t) => isOn(t.command))
          .map((t) => t.command)
          .join(' '),
      );
    };
    document.addEventListener('selectionchange', update);
    return () => {
      document.removeEventListener('selectionchange', update);
    };
  }, []);

  const save = () => {
    const el = ref.current;
    if (!el) return;
    const html = el.textContent.trim() ? sanitizeNote(el.innerHTML) : '';
    saved.current = html;
    actions.editNote(section.id, html);
  };

  const inList = () => {
    const at = document.getSelection()?.anchorNode;
    const el = at instanceof Element ? at : at?.parentElement;
    return ref.current?.contains(el?.closest('li') ?? null) ?? false;
  };

  return (
    <>
      <div className={bodyClassName}>
        <div
          ref={ref}
          className={`${styles.editor} nodrag`}
          contentEditable
          role="textbox"
          aria-multiline
          aria-label="Note"
          data-empty={note === '' || undefined}
          data-placeholder="Write a note…"
          // One undo step per visit; no bring-to-front, whose reorder would steal focus.
          onFocus={() => {
            actions.startGesture();
          }}
          onBlur={() => {
            actions.endGesture();
          }}
          onInput={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            } else if (e.key === 'Tab' && inList()) {
              e.preventDefault();
              exec(e.shiftKey ? 'outdent' : 'indent');
            }
          }}
          // Plain text only: pasted styles would clash with the theme.
          onPaste={(e) => {
            e.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
          onDrop={(e) => {
            e.preventDefault();
          }}
        />
      </div>
      <div className={`${styles.tools} nodrag`} role="toolbar" aria-label="Formatting">
        {TOOLS.map(({ command, label, Icon }) => (
          <button
            key={command}
            type="button"
            className={styles.tool}
            aria-label={label}
            title={label}
            aria-pressed={active.split(' ').includes(command)}
            // Keep focus and the selection in the text.
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={() => {
              if (document.activeElement !== ref.current) ref.current?.focus();
              exec(command);
            }}
          >
            <Icon size={16} aria-hidden />
          </button>
        ))}
      </div>
    </>
  );
}
