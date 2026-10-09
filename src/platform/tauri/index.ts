import { fakeClock, fakeTimer, fakeWindow } from '../fake';
import type { Platform } from '../ports';
import { matchMediaTheme } from '../systemTheme';
import { tauriDocumentStore } from './store';

export function createTauriPlatform(): Platform {
  const clock = { now: () => Date.now() };
  return {
    store: tauriDocumentStore,
    // Replaced by native adapters in US3 (timer) and US5 (window).
    window: fakeWindow().controls,
    timer: fakeTimer(fakeClock()).timer,
    clock,
    systemTheme: matchMediaTheme(),
  };
}
