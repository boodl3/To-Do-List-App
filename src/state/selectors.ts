import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { AppState, AppStore } from './store';

export const StoreContext = createContext<AppStore | null>(null);

export function useAppStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext missing');
  return store;
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useStore(useAppStore(), selector);
}

export const useBoard = () => useApp((s) => s.doc.board);
export const usePrefs = () => useApp((s) => s.doc.prefs);
export const usePomodoro = () => useApp((s) => s.doc.pomodoro);
export const useCanUndo = () => useApp((s) => s.history.past.length > 0);
export const useCanRedo = () => useApp((s) => s.history.future.length > 0);
