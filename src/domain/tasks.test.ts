import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Section, Task } from './schema';
import {
  addSubtask,
  addTask,
  deleteItem,
  editText,
  indent,
  moveItem,
  outdent,
  setEstimate,
  toggleDone,
} from './tasks';

const section = (tasks: Task[] = []): Section => ({
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
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  text: id,
  done: false,
  estimateMin: null,
  subtasks: [],
  ...extra,
});
const sub = (id: string, done = false) => ({ id, text: id, done, estimateMin: null });
const ids = (s: Section) => s.tasks.map((t) => [t.id, t.subtasks.map((x) => x.id)]);

describe('addTask / addSubtask', () => {
  it('appends by default and inserts after a given task', () => {
    let s = addTask(section(), 'a', 'A');
    s = addTask(s, 'c', 'C');
    s = addTask(s, 'b', 'B', 'a');
    expect(s.tasks.map((t) => t.text)).toEqual(['A', 'B', 'C']);
  });

  it('adds a subtask after a sibling and un-completes a done parent', () => {
    let s = section([task('p', { done: true, subtasks: [sub('x', true), sub('z', true)] })]);
    s = addSubtask(s, 'p', 'y', 'Y', 'x');
    expect(ids(s)).toEqual([['p', ['x', 'y', 'z']]]);
    expect(s.tasks[0]!.done).toBe(false);
  });
});

describe('editText / setEstimate', () => {
  it('clamps text to 500 characters and edits subtasks too', () => {
    let s = section([task('a', { subtasks: [sub('x')] })]);
    s = editText(s, 'a', 'y'.repeat(600));
    s = editText(s, 'x', 'sub');
    expect(s.tasks[0]!.text).toHaveLength(500);
    expect(s.tasks[0]!.subtasks[0]!.text).toBe('sub');
  });

  it('returns the same section when nothing changes', () => {
    const s = section([task('a', { estimateMin: 30 })]);
    expect(editText(s, 'a', 'a')).toBe(s);
    expect(setEstimate(s, 'a', 30)).toBe(s);
    expect(editText(s, 'missing', 'x')).toBe(s);
  });

  it('sets estimates on tasks and subtasks', () => {
    let s = section([task('a', { subtasks: [sub('x')] })]);
    s = setEstimate(s, 'x', 45);
    expect(s.tasks[0]!.subtasks[0]!.estimateMin).toBe(45);
  });
});

describe('deleteItem', () => {
  it('removes a task with its subtasks, or a single subtask', () => {
    let s = section([task('a', { subtasks: [sub('x'), sub('y')] }), task('b')]);
    s = deleteItem(s, 'x');
    expect(ids(s)).toEqual([
      ['a', ['y']],
      ['b', []],
    ]);
    s = deleteItem(s, 'a');
    expect(ids(s)).toEqual([['b', []]]);
  });

  it('completes the parent when the only unfinished subtask is deleted', () => {
    const s = deleteItem(section([task('p', { subtasks: [sub('x', true), sub('y')] })]), 'y');
    expect(s.tasks[0]!.done).toBe(true);
  });
});

describe('indent / outdent', () => {
  it('indents a task under the task above', () => {
    const s = indent(section([task('a'), task('b')]), 'b');
    expect(ids(s)).toEqual([['a', ['b']]]);
  });

  it('is a no-op for the first task, a subtask, or a task with subtasks', () => {
    const s = section([task('a'), task('b', { subtasks: [sub('x')] })]);
    expect(indent(s, 'a')).toBe(s);
    expect(indent(s, 'x')).toBe(s);
    expect(indent(s, 'b')).toBe(s);
  });

  it('outdents a subtask to a task right after its parent', () => {
    const s = outdent(section([task('a', { subtasks: [sub('x'), sub('y')] }), task('b')]), 'x');
    expect(ids(s)).toEqual([
      ['a', ['y']],
      ['x', []],
      ['b', []],
    ]);
  });

  it('keeps the estimate and done state when moving between levels', () => {
    let s = section([task('a'), task('b', { estimateMin: 20, done: true })]);
    s = indent(s, 'b');
    expect(s.tasks[0]!.subtasks[0]).toMatchObject({ estimateMin: 20, done: true });
    s = outdent(s, 'b');
    expect(s.tasks[1]).toMatchObject({ estimateMin: 20, done: true, subtasks: [] });
  });
});

describe('moveItem', () => {
  it('reorders tasks and subtasks within their own list', () => {
    let s = section([task('a', { subtasks: [sub('x'), sub('y')] }), task('b'), task('c')]);
    s = moveItem(s, 'c', 0);
    s = moveItem(s, 'y', 0);
    expect(ids(s)).toEqual([
      ['c', []],
      ['a', ['y', 'x']],
      ['b', []],
    ]);
  });

  it('clamps out-of-range targets and ignores unknown ids', () => {
    const s = section([task('a'), task('b')]);
    expect(ids(moveItem(s, 'a', 99))).toEqual([
      ['b', []],
      ['a', []],
    ]);
    expect(moveItem(s, 'zzz', 0)).toBe(s);
  });
});

describe('toggleDone (FR-015)', () => {
  it('toggling a parent sets every subtask to the same value', () => {
    let s = section([task('p', { subtasks: [sub('x'), sub('y', true)] })]);
    s = toggleDone(s, 'p');
    expect(s.tasks[0]!.done).toBe(true);
    expect(s.tasks[0]!.subtasks.every((x) => x.done)).toBe(true);
    s = toggleDone(s, 'p');
    expect(s.tasks[0]!.done).toBe(false);
    expect(s.tasks[0]!.subtasks.some((x) => x.done)).toBe(false);
  });

  it('completing the last subtask completes the parent; un-completing one reopens it', () => {
    let s = section([task('p', { subtasks: [sub('x', true), sub('y')] })]);
    s = toggleDone(s, 'y');
    expect(s.tasks[0]!.done).toBe(true);
    s = toggleDone(s, 'x');
    expect(s.tasks[0]!.done).toBe(false);
  });

  it('toggles a plain task', () => {
    expect(toggleDone(section([task('a')]), 'a').tasks[0]!.done).toBe(true);
  });

  it('keeps the invariant after any sequence of operations', () => {
    const op = fc.oneof(
      fc.record({ kind: fc.constant('toggle'), i: fc.nat(8) }),
      fc.record({ kind: fc.constant('indent'), i: fc.nat(8) }),
      fc.record({ kind: fc.constant('outdent'), i: fc.nat(8) }),
      fc.record({ kind: fc.constant('delete'), i: fc.nat(8) }),
      fc.record({ kind: fc.constant('addSub'), i: fc.nat(8) }),
    );
    fc.assert(
      fc.property(fc.array(op, { maxLength: 40 }), (ops) => {
        let s = section(['a', 'b', 'c', 'd'].map((id) => task(id)));
        let n = 0;
        for (const { kind, i } of ops) {
          const all = s.tasks.flatMap((t) => [t.id, ...t.subtasks.map((x) => x.id)]);
          const target = all[i % Math.max(all.length, 1)];
          if (!target) {
            s = addTask(s, `n${n++}`, '');
            continue;
          }
          if (kind === 'toggle') s = toggleDone(s, target);
          if (kind === 'indent') s = indent(s, target);
          if (kind === 'outdent') s = outdent(s, target);
          if (kind === 'delete') s = deleteItem(s, target);
          if (kind === 'addSub' && s.tasks.some((t) => t.id === target)) {
            s = addSubtask(s, target, `n${n++}`, '');
          }
        }
        for (const t of s.tasks) {
          if (t.subtasks.length > 0) expect(t.done).toBe(t.subtasks.every((x) => x.done));
        }
      }),
    );
  });
});
