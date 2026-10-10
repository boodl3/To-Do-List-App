import type { SystemTheme } from './ports';

/** OS light/dark preference via matchMedia; identical in the browser and in the Tauri webview. */
export function matchMediaTheme(): SystemTheme {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  return {
    prefersDark: () => query.matches,
    onChange(handler) {
      const listener = (e: MediaQueryListEvent) => {
        handler(e.matches);
      };
      query.addEventListener('change', listener);
      return () => {
        query.removeEventListener('change', listener);
      };
    },
  };
}
