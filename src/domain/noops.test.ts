import { describe, expect, it } from 'vitest';
import * as C from './connections';
import { emptyDocument } from './defaults';
import { completionMessage, start } from './pomodoro';
import { remainingEstimate, taskEstimate } from './rollup';
import type { Section, Task } from './schema';
import * as S from './sections';
import * as T from './tasks';

/**
 * "Nothing changed → same object back" is what keeps empty steps out of undo history.
 * These cover the no-op and not-found branches the feature tests don't reach.
 */
const board = () => {
  let b = S.createSection(emptyDocument(0).board, { id: 'a', x: 0, y: 0, now: 0 });
  b = S.createSection(b, { id: 'b', x: 400, y: 0, now: 0 });
  return C.connect(b, { id: 'c', from: 'a', to: 'b' });
};

describe('sections: unchanged input returns the same board', () => {
  it.each([
    ['move to same spot', (b: ReturnType<typeof board>) => S.moveSection(b, 'a', 0, 0)],
    [
      'resize to same rect',
      (b) => S.resizeSection(b, 'a', { x: 0, y: 0, width: 320, height: 240 }),
    ],
    ['recolor to same accent', (b) => S.recolorSection(b, 'a', 'orange')],
    ['delete unknown section', (b) => S.deleteSection(b, 'zzz')],
    ['bring unknown to front', (b) => S.bringToFront(b, 'zzz')],
  ])('%s', (_, op) => {
    const b = board();
    expect(op(b)).toBe(b);
  });
});

describe('connections: unchanged input returns the same board', () => {
  it.each([
    ['restyle unknown', (b: ReturnType<typeof board>) => C.restyle(b, 'zzz', 'line')],
    ['same label', (b) => C.setLabel(b, 'c', '')],
    ['remove unknown', (b) => C.removeConnection(b, 'zzz')],
    ['reverse unknown', (b) => C.reverse(b, 'zzz')],
  ])('%s', (_, op) => {
    const b = board();
    expect(op(b)).toBe(b);
  });
});

const sub = (id: string, done = false, estimateMin: number | null = null) => ({
  id,
  text: id,
  done,
  estimateMin,
});
const section = (tasks: Task[]): Section => ({
  id: 's',
  title: '',
  accent: 'orange',
  x: 0,
  y: 0,
  width: 320,
  height: 240,
  createdAt: 0,
  tasks,
});
const task = (id: string, subtasks: Task['subtasks'] = []): Task => ({
  id,
  text: id,
  done: subtasks.length > 0 && subtasks.every((s) => s.done),
  estimateMin: null,
  subtasks,
});

describe('tasks: unchanged input returns the same section', () => {
  const s = section([task('p', [sub('x', false, 10), sub('y')]), task('q')]);
  it.each([
    ['toggle unknown', () => T.toggleDone(s, 'zzz')],
    ['delete unknown', () => T.deleteItem(s, 'zzz')],
    ['outdent a task', () => T.outdent(s, 'q')],
    ['outdent unknown', () => T.outdent(s, 'zzz')],
    ['indent unknown', () => T.indent(s, 'zzz')],
    ['same subtask estimate', () => T.setEstimate(s, 'x', 10)],
    ['same subtask text', () => T.editText(s, 'x', 'x')],
    ['move subtask to its own index', () => T.moveItem(s, 'x', 0)],
    ['move task to its own index', () => T.moveItem(s, 'q', 1)],
  ])('%s', (_, op) => {
    expect(op()).toBe(s);
  });

  it('reports -1 for an unknown index and finds subtasks', () => {
    expect(T.indexOfItem(s, 'zzz')).toBe(-1);
    expect(T.indexOfItem(s, 'y')).toBe(1);
  });

  it('adds a subtask at the end without an anchor, and ignores an unknown parent', () => {
    const added = T.addSubtask(s, 'p', 'z', 'Z');
    expect(added.tasks[0]!.subtasks.map((x) => x.id)).toEqual(['x', 'y', 'z']);
    expect(T.addSubtask(s, 'nope', 'z', 'Z').tasks).toEqual(s.tasks);
  });
});

describe('roll-up details', () => {
  it('counts subtasks without estimates as zero, done or not', () => {
    const t = task('p', [sub('x', true), sub('y', false), sub('z', false, 20)]);
    expect(taskEstimate(t)).toBe(20);
    expect(remainingEstimate(t)).toBe(20);
  });
});

describe('pomodoro messages', () => {
  it('announces a long break before the 4th focus session ends', () => {
    const p = { ...emptyDocument(0).pomodoro, focusStreak: 3 };
    expect(completionMessage(start(p, 0, 'id'))).toEqual({
      title: 'Focus session complete',
      body: 'Time for a 15-minute long break.',
    });
  });
});
