import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const GAP = 4;
const MARGIN = 8;

/**
 * A native popover pinned under its trigger, right-aligned to it, flipped above when there's no
 * room below. `open` tracks the popover's state so callers can render contents only while open.
 */
export function useAnchoredPopover() {
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = popover.current;
    if (!el) return;
    const onToggle = (e: Event) => {
      setOpen((e as ToggleEvent).newState === 'open');
    };
    el.addEventListener('toggle', onToggle);
    return () => {
      el.removeEventListener('toggle', onToggle);
    };
  }, []);
  useLayoutEffect(() => {
    const el = popover.current;
    if (!open || !el || !button.current) return;
    const r = button.current.getBoundingClientRect();
    const below = r.bottom + GAP;
    const fitsBelow = below + el.offsetHeight <= window.innerHeight - MARGIN;
    el.style.top = `${fitsBelow ? below : Math.max(MARGIN, r.top - GAP - el.offsetHeight)}px`;
    el.style.left = `${Math.max(MARGIN, r.right - el.offsetWidth)}px`;
  }, [open]);
  return { button, popover, open };
}
