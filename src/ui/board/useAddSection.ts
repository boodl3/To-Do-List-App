import { useActions } from '../app/useActions';
import { useVisibleRect } from './useVisibleRect';

/** Adds a section (or a note) in the nearest free spot of the visible board (FR-006). */
export function useAddSection(note = false) {
  const actions = useActions();
  const visible = useVisibleRect();
  return () => {
    actions.addSection(visible(), { note });
  };
}
