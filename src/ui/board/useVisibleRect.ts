import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import type { Rect } from '../../domain/layout/placement';

/** The part of the board currently on screen, in board units. */
export function useVisibleRect(): () => Rect {
  const { getViewport } = useReactFlow();
  return useCallback(() => {
    const { x, y, zoom } = getViewport();
    const el = document.querySelector('main');
    return {
      x: -x / zoom,
      y: -y / zoom,
      width: (el?.clientWidth ?? window.innerWidth) / zoom,
      height: (el?.clientHeight ?? window.innerHeight) / zoom,
    };
  }, [getViewport]);
}
