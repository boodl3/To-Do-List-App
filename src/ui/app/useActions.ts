import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { createActions, type Actions } from '../../state/actions';
import { useApp, useAppStore } from '../../state/selectors';
import { usePlatform } from './PlatformProvider';

export function useActions(): Actions {
  const store = useAppStore();
  const { clock } = usePlatform();
  return useMemo(() => createActions(store, () => clock.now()), [store, clock]);
}

/** Focuses the element when the store's focus request names `id`, then clears the request. */
export function useFocusRequest<T extends HTMLElement>(id: string): RefObject<T | null> {
  const ref = useRef<T>(null);
  const requested = useApp((s) => s.focusRequest === id);
  const requestFocus = useApp((s) => s.requestFocus);
  useEffect(() => {
    if (!requested || !ref.current) return;
    const el = ref.current;
    el.focus();
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      el.setSelectionRange(el.value.length, el.value.length);
    }
    requestFocus(null);
  }, [requested, requestFocus]);
  return ref;
}
