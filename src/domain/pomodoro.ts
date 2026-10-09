import { localDateKey } from './defaults';
import type { PomodoroMode, PomodoroSettings, PomodoroState } from './schema';

/**
 * Pomodoro state machine (data-model "Pomodoro state machine", FR-020 – FR-022).
 * Pure `(state, …, now) → state`. Time has one source of truth: `endsAt` (research R6).
 * Functions return the same object when an action doesn't apply.
 */
const MIN = 60_000;

export function durationOf(mode: PomodoroMode, s: PomodoroSettings): number {
  const minutes =
    mode === 'focus' ? s.focusMin : mode === 'shortBreak' ? s.shortBreakMin : s.longBreakMin;
  return minutes * MIN;
}

export function remainingMs(p: PomodoroState, now: number): number {
  switch (p.status.kind) {
    case 'running':
      return Math.max(0, p.status.endsAt - now);
    case 'paused':
      return p.status.remainingMs;
    case 'idle':
      return durationOf(p.mode, p.settings);
  }
}

export function start(p: PomodoroState, now: number, sessionId: string): PomodoroState {
  if (p.status.kind !== 'idle') return p;
  return {
    ...p,
    sessionId,
    status: { kind: 'running', endsAt: now + durationOf(p.mode, p.settings) },
  };
}

export function pause(p: PomodoroState, now: number): PomodoroState {
  if (p.status.kind !== 'running') return p;
  return { ...p, status: { kind: 'paused', remainingMs: Math.max(0, p.status.endsAt - now) } };
}

export function resume(p: PomodoroState, now: number): PomodoroState {
  if (p.status.kind !== 'paused') return p;
  return { ...p, status: { kind: 'running', endsAt: now + p.status.remainingMs } };
}

export function reset(p: PomodoroState): PomodoroState {
  return { ...p, sessionId: null, status: { kind: 'idle' } };
}

/** Today's counter, rolled over when the local date changed. */
function today(p: PomodoroState, now: number): PomodoroState['completedToday'] {
  const date = localDateKey(now);
  return p.completedToday.date === date ? p.completedToday : { date, count: 0 };
}

const nextBreak = (p: PomodoroState): PomodoroMode =>
  (p.focusStreak + 1) % p.settings.longBreakEvery === 0 ? 'longBreak' : 'shortBreak';

/** Session finished: count focus, pick the next mode, land idle (no auto-start). */
export function complete(p: PomodoroState, now: number): PomodoroState {
  const base = { ...reset(p), completedToday: today(p, now) };
  if (p.mode !== 'focus') return { ...base, mode: 'focus' };
  const mode = nextBreak(p);
  return {
    ...base,
    mode,
    focusStreak: mode === 'longBreak' ? 0 : p.focusStreak + 1,
    completedToday: { ...base.completedToday, count: base.completedToday.count + 1 },
  };
}

/** Move on without counting the session. */
export function skip(p: PomodoroState): PomodoroState {
  return { ...reset(p), mode: p.mode === 'focus' ? 'shortBreak' : 'focus' };
}

/** Apply anything time has made true: a session that ended, or a new day. */
export function reconcile(p: PomodoroState, now: number): PomodoroState {
  if (p.status.kind === 'running' && p.status.endsAt <= now) return complete(p, now);
  const completedToday = today(p, now);
  return completedToday === p.completedToday ? p : { ...p, completedToday };
}

export function updateSettings(p: PomodoroState, settings: PomodoroSettings): PomodoroState {
  return { ...p, settings };
}

export const MODE_LABEL: Record<PomodoroMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

/** Text for the completion notification of the session in progress. */
export function completionMessage(p: PomodoroState): { title: string; body: string } {
  if (p.mode !== 'focus') {
    return { title: 'Break over', body: 'Ready for the next focus session?' };
  }
  const next = nextBreak(p);
  const minutes = durationOf(next, p.settings) / MIN;
  return {
    title: 'Focus session complete',
    body: `Time for a ${minutes}-minute ${next === 'longBreak' ? 'long ' : ''}break.`,
  };
}
