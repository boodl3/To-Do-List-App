import { useActions } from '../app/useActions';
import { useVisibleRect } from './useVisibleRect';

/** Adds a section in the nearest free spot of the visible board (FR-006). */
export function useAddSection() {
  const actions = useActions();
  const visible = useVisibleRect();
  return () => {
    actions.addSection(visible());
  };
}
