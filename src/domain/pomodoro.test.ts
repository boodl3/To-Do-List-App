import { describe, expect, it } from 'vitest';
import { emptyDocument } from './defaults';
import * as P from './pomodoro';
import type { PomodoroState } from './schema';

const T0 = Date.UTC(2026, 9, 10, 9, 0); // 09:00 UTC (tests run with TZ=UTC)
const MIN = 60_000;
const fresh = (): PomodoroState => emptyDocument(T0).pomodoro;
const SID = '0b5c0f9e-6a43-4c1e-9a77-3f1d2b8e4c11';

describe('pomodoro state machine', () => {
  it('starts a focus session ending one duration from now', () => {
    const p = P.start(fresh(), T0, SID);
    expect(p.status).toEqual({ kind: 'running', endsAt: T0 + 25 * MIN });
    expect(p.sessionId).toBe(SID);
    expect(P.remainingMs(p, T0 + 5 * MIN)).toBe(20 * MIN);
  });

  it('pause freezes the remaining time exactly and never completes while paused', () => {
    let p = P.pause(P.start(fresh(), T0, SID), T0 + 61_234);
    expect(p.status).toEqual({ kind: 'paused', remainingMs: 25 * MIN - 61_234 });
    expect(P.reconcile(p, T0 + 999 * MIN).status).toEqual(p.status);
    expect(P.remainingMs(p, T0 + 999 * MIN)).toBe(25 * MIN - 61_234);
    p = P.resume(p, T0 + 10 * MIN);
    expect(p.status).toEqual({ kind: 'running', endsAt: T0 + 10 * MIN + 25 * MIN - 61_234 });
  });

  it('reset returns to idle in the same mode', () => {
    const p = P.reset(P.start(fresh(), T0, SID));
    expect(p.status).toEqual({ kind: 'idle' });
    expect(p.mode).toBe('focus');
    expect(p.sessionId).toBeNull();
    expect(P.remainingMs(p, T0)).toBe(25 * MIN);
  });

  it('completing focus counts it and prepares a short break, idle (no auto-start)', () => {
    const p = P.complete(P.start(fresh(), T0, SID), T0 + 25 * MIN);
    expect(p.mode).toBe('shortBreak');
    expect(p.status).toEqual({ kind: 'idle' });
    expect(p.focusStreak).toBe(1);
    expect(p.completedToday).toEqual({ date: '2026-10-10', count: 1 });
  });

  it('every 4th focus session leads to a long break and resets the streak', () => {
    let p = fresh();
    for (let i = 0; i < 4; i++) {
      p = P.complete(P.start({ ...p, mode: 'focus' }, T0, SID), T0);
    }
    expect(p.mode).toBe('longBreak');
    expect(p.focusStreak).toBe(0);
    expect(p.completedToday.count).toBe(4);
  });

  it('a break completes into focus without counting', () => {
    const p = P.complete(P.start({ ...fresh(), mode: 'shortBreak' }, T0, SID), T0 + 5 * MIN);
    expect(p.mode).toBe('focus');
    expect(p.completedToday.count).toBe(0);
  });

  it('skip advances without counting', () => {
    const p = P.skip(P.start(fresh(), T0, SID));
    expect(p.mode).toBe('shortBreak');
    expect(p.completedToday.count).toBe(0);
    expect(p.focusStreak).toBe(0);
    expect(P.skip(p).mode).toBe('focus');
  });

  it('reconcile completes a running session whose end passed (restart, sleep, clock jump)', () => {
    const running = P.start(fresh(), T0, SID);
    expect(P.reconcile(running, T0 + 24 * MIN)).toBe(running);
    const done = P.reconcile(running, T0 + 3 * 60 * MIN);
    expect(done.mode).toBe('shortBreak');
    expect(done.completedToday.count).toBe(1);
    expect(P.remainingMs(running, T0 + 99 * MIN)).toBe(0); // never negative
  });

  it("today's count resets on a new local date", () => {
    const p = { ...fresh(), completedToday: { date: '2026-10-09', count: 7 } };
    expect(P.reconcile(p, T0).completedToday).toEqual({ date: '2026-10-10', count: 0 });
    const next = P.complete(P.start(p, T0, SID), T0 + 25 * MIN);
    expect(next.completedToday).toEqual({ date: '2026-10-10', count: 1 });
  });

  it('new settings apply from the next session, not the running one', () => {
    const running = P.start(fresh(), T0, SID);
    const changed = P.updateSettings(running, { ...running.settings, focusMin: 50 });
    expect(changed.status).toEqual(running.status);
    expect(P.remainingMs(P.reset(changed), T0)).toBe(50 * MIN);
  });

  it('ignores actions that do not apply to the current status', () => {
    const idle = fresh();
    expect(P.pause(idle, T0)).toBe(idle);
    expect(P.resume(idle, T0)).toBe(idle);
    const running = P.start(idle, T0, SID);
    expect(P.start(running, T0 + 1, 'other')).toBe(running);
  });

  it('describes the next completion for the native notification', () => {
    expect(P.completionMessage(P.start(fresh(), T0, SID))).toEqual({
      title: 'Focus session complete',
      body: 'Time for a 5-minute break.',
    });
  });
});
