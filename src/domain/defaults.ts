import {
  CURRENT_SCHEMA_VERSION,
  type AppDocument,
  type PomodoroSettings,
  type PresetAccent,
} from './schema';

export const GRID = 8;
export const BOARD_GAP = 24;
export const MIN_SECTION = { width: 240, height: 160 } as const;
export const DEFAULT_SECTION = { width: 320, height: 240 } as const;
export const ACCENTS: readonly PresetAccent[] = [
  'orange',
  'mint',
  'pink',
  'yellow',
  'violet',
  'sky',
];
export const WIDGET_DEFAULT_SIZE = { width: 248, height: 216 } as const;

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  sound: true,
};

/** Local calendar date `YYYY-MM-DD` for an epoch-ms instant. */
export function localDateKey(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function emptyDocument(now: number): AppDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    board: { sections: [], connections: [], viewport: { x: 0, y: 0, zoom: 1 } },
    pomodoro: {
      settings: DEFAULT_SETTINGS,
      mode: 'focus',
      status: { kind: 'idle' },
      sessionId: null,
      focusStreak: 0,
      completedToday: { date: localDateKey(now), count: 0 },
      linkedTaskId: null,
      widget: { x: 24, y: 80, ...WIDGET_DEFAULT_SIZE, visible: false },
    },
    prefs: { theme: 'system', pinned: false },
  };
}
