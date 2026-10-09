import { useReactFlow } from '@xyflow/react';
import { DEFAULT_SECTION, GRID } from '../../domain/defaults';
import { useActions } from '../app/useActions';

const snap = (v: number) => Math.round(v / GRID) * GRID;

/** Adds a section centred in the visible board (US2 replaces this with free-spot placement). */
export function useAddSection() {
  const { screenToFlowPosition } = useReactFlow();
  const actions = useActions();
  return () => {
    const board = document.querySelector('main')?.getBoundingClientRect();
    const centre = screenToFlowPosition({
      x: board ? board.left + board.width / 2 : window.innerWidth / 2,
      y: board ? board.top + board.height / 2 : window.innerHeight / 2,
    });
    actions.addSection(
      snap(centre.x - DEFAULT_SECTION.width / 2),
      snap(centre.y - DEFAULT_SECTION.height / 2),
    );
  };
}
