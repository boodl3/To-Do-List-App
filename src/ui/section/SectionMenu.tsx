import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { ACCENTS } from '../../domain/defaults';
import type { Section } from '../../domain/schema';
import { useActions } from '../app/useActions';
import { useAnchoredPopover } from '../app/useAnchoredPopover';
import { ConnectMenu } from './ConnectMenu';
import styles from './SectionMenu.module.css';

const label = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Section options in a native popover (top layer, so the card's rounded clip can't cut it). */
export function SectionMenu({ section }: { section: Section }) {
  const actions = useActions();
  const id = useId();
  // Contents render only while open: closed menus on a big board were thousands of nodes (T117).
  const { button, popover, open } = useAnchoredPopover();

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
        {open && (
          <>
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
          </>
        )}
      </div>
    </>
  );
}
