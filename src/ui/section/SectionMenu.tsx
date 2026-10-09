import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { ACCENTS } from '../../domain/defaults';
import type { Section } from '../../domain/schema';
import { useActions } from '../app/useActions';
import { ConnectMenu } from './ConnectMenu';
import styles from './SectionMenu.module.css';

const label = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Section options in a native popover (top layer, so the card's rounded clip can't cut it). */
export function SectionMenu({ section }: { section: Section }) {
  const actions = useActions();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = popover.current;
    if (!el) return;
    const place = (e: Event) => {
      if ((e as ToggleEvent).newState !== 'open' || !button.current) return;
      const r = button.current.getBoundingClientRect();
      el.style.top = `${r.bottom + 4}px`;
      el.style.left = `${Math.max(8, r.right - el.offsetWidth)}px`;
    };
    el.addEventListener('toggle', place);
    return () => {
      el.removeEventListener('toggle', place);
    };
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`${styles.trigger} nodrag`}
        aria-label="Section options"
        popoverTarget={id}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        className={`${styles.popover} nodrag nowheel`}
        role="dialog"
        aria-label="Section options"
      >
        <fieldset className={styles.colors}>
          <legend className={styles.legend}>Colour</legend>
          {ACCENTS.map((accent) => (
            <label
              key={accent}
              className={styles.swatch}
              data-accent={accent}
              title={label(accent)}
            >
              <input
                type="radio"
                name={`${id}-accent`}
                checked={section.accent === accent}
                aria-label={label(accent)}
                onChange={() => {
                  actions.recolorSection(section.id, accent);
                }}
              />
            </label>
          ))}
        </fieldset>
        <ConnectMenu
          sectionId={section.id}
          onDone={() => {
            popover.current?.hidePopover();
          }}
        />
        <button
          type="button"
          className={styles.danger}
          onClick={() => {
            popover.current?.hidePopover();
            actions.requestDeleteSection(section.id);
          }}
        >
          <Trash2 size={16} aria-hidden /> Delete section
        </button>
      </div>
    </>
  );
}
