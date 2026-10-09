import { useEffect } from 'react';
import { useAppStore } from '../../state/selectors';

export function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Global undo/redo. Inside text fields the browser's own text undo wins. */
export function useGlobalShortcuts(): void {
  const store = useAppStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextEntry(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) store.getState().undo();
      else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) store.getState().redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [store]);
}
