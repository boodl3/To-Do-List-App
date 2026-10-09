import { fakeWindow } from '../fake';
import type { Platform } from '../ports';
import { matchMediaTheme } from '../systemTheme';
import { tauriDocumentStore } from './store';
import { tauriTimer } from './timer';

export function createTauriPlatform(): Platform {
  return {
    store: tauriDocumentStore,
    // Replaced by the native adapter in US5.
    window: fakeWindow().controls,
    timer: tauriTimer,
    clock: { now: () => Date.now() },
    systemTheme: matchMediaTheme(),
  };
}
