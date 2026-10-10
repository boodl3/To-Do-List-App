import { describe, expect, it } from 'vitest';
import { remainingEstimate, sectionProgress, sectionRemaining, taskEstimate } from './rollup';
import type { Section, Task } from './schema';

const t = (est: number | null, done = false, subtasks: Task['subtasks'] = []): Task => ({
  id: crypto.randomUUID(),
  text: '',
  done,
  estimateMin: est,
  subtasks,
});
const s = (est: number | null, done = false) => ({
  id: crypto.randomUUID(),
  text: '',
  done,
  estimateMin: est,
});
const section = (tasks: Task[]): Section => ({
  id: 's',
  title: '',
  accent: 'orange',
  x: 0,
  y: 0,
  width: 320,
  height: 240,
  tasks,
  createdAt: 0,
});

describe('taskEstimate', () => {
  it("uses the task's own estimate without subtasks", () => {
    expect(taskEstimate(t(25))).toBe(25);
    expect(taskEstimate(t(null))).toBe(0);
  });

  it('sums subtasks and ignores the parent value while they exist', () => {
    expect(taskEstimate(t(999, false, [s(30), s(45), s(null)]))).toBe(75);
  });

  it("restores the parent's own value once all subtasks are gone", () => {
    expect(taskEstimate(t(40, false, []))).toBe(40);
  });
});

describe('remainingEstimate / sectionRemaining', () => {
  it('counts only incomplete items', () => {
    expect(remainingEstimate(t(25, true))).toBe(0);
    expect(remainingEstimate(t(25))).toBe(25);
    expect(remainingEstimate(t(999, false, [s(30, true), s(45)]))).toBe(45);
    expect(
      sectionRemaining(section([t(60), t(10, true), t(null, false, [s(30, true), s(45)])])),
    ).toBe(105);
  });
});

describe('sectionProgress', () => {
  it('counts leaf items (subtasks, or tasks without subtasks)', () => {
    const p = sectionProgress(section([t(null, true), t(null, false, [s(null, true), s(null)])]));
    expect(p).toEqual({ done: 2, total: 3 });
  });

  it('is 0/0 for an empty section', () => {
    expect(sectionProgress(section([]))).toEqual({ done: 0, total: 0 });
  });
});
