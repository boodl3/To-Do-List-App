import type { Platform } from '../ports';
import { matchMediaTheme } from '../systemTheme';
import { tauriDocumentStore } from './store';
import { tauriTimer } from './timer';
import { tauriWindow } from './window';

export function createTauriPlatform(): Platform {
  return {
    store: tauriDocumentStore,
    window: tauriWindow,
    timer: tauriTimer,
    clock: { now: () => Date.now() },
    systemTheme: matchMediaTheme(),
  };
}
