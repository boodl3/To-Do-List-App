import { createFakePlatform } from './fake';
import type { Platform } from './ports';
import { createTauriPlatform } from './tauri';

/** Native adapters inside the Tauri shell; in-memory fakes in a plain browser (dev, Playwright). */
export function createPlatform(): Platform {
  return '__TAURI_INTERNALS__' in window ? createTauriPlatform() : createFakePlatform();
}
