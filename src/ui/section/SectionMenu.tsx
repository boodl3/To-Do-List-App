import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { parseHex } from '../../domain/color';
import { ACCENTS } from '../../domain/defaults';
import type { Section } from '../../domain/schema';
import { isNote } from '../../domain/sections';
import { useActions } from '../app/useActions';
import { useAnchoredPopover } from '../app/useAnchoredPopover';
import { customAccentStyle, isCustomAccent } from '../theme/customAccent';
import { ColorPicker } from './ColorPicker';
import { ConnectMenu } from './ConnectMenu';
import styles from './SectionMenu.module.css';

const label = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** A preset's colour from its token, as the picker's starting point. */
const presetHex = (accent: string) =>
  parseHex(getComputedStyle(document.documentElement).getPropertyValue(`--accent-${accent}`)) ??
  '#7038f4';

/** Section options in a native popover (top layer, so the card's rounded clip can't cut it). */
export function SectionMenu({ section }: { section: Section }) {
  const actions = useActions();
  const id = useId();
  const [picking, setPicking] = useState(false);
  // Contents render only while open: closed menus on a big board were thousands of nodes (T117).
  const { button, popover, open } = useAnchoredPopover(picking);
  if (!open && picking) setPicking(false); // the picker starts collapsed each time
  const custom = isCustomAccent(section.accent);
  const kind = isNote(section) ? 'note' : 'section';
  const name = isNote(section) ? 'Note options' : 'Section options';

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`${styles.trigger} nodrag`}
        aria-label={name}
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
        aria-label={name}
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
                      setPicking(false); // a preset replaces the custom colour
                    }}
                  />
                </label>
              ))}
              <button
                type="button"
                className={styles.custom}
                data-selected={custom || undefined}
                style={customAccentStyle(section.accent)}
                aria-label={custom ? `Custom colour ${section.accent}` : 'Custom colour'}
                title="Custom colour"
                aria-expanded={picking}
                onClick={() => {
                  setPicking(!picking);
                }}
              >
                <Plus size={14} aria-hidden />
              </button>
            </fieldset>
            {picking && (
              <ColorPicker
                value={custom ? section.accent : presetHex(section.accent)}
                onChange={(hex) => {
                  actions.recolorSection(section.id, hex);
                }}
                onGestureStart={() => {
                  actions.startGesture(); // no bring-to-front: reordering would close this popover
                }}
                onGestureEnd={() => {
                  actions.endGesture();
                }}
              />
            )}
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
              <Trash2 size={16} aria-hidden /> Delete {kind}
            </button>
          </>
        )}
      </div>
    </>
  );
}
