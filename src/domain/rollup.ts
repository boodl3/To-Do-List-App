import type { Section, Subtask, Task } from './schema';

/** Derived values (data-model "Derived values") — never stored. */
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

export function taskEstimate(t: Task): number {
  return t.subtasks.length > 0
    ? sum(t.subtasks.map((s) => s.estimateMin ?? 0))
    : (t.estimateMin ?? 0);
}

/** A task's or subtask's own estimate (a parent's is its subtasks' sum); null when there is none. */
export function itemEstimate(item: Task | Subtask): number | null {
  return ('subtasks' in item ? taskEstimate(item) : item.estimateMin) || null;
}

export function remainingEstimate(t: Task): number {
  if (t.subtasks.length > 0) return sum(t.subtasks.map((s) => (s.done ? 0 : (s.estimateMin ?? 0))));
  return t.done ? 0 : (t.estimateMin ?? 0);
}

export function sectionRemaining(s: Section): number {
  return sum(s.tasks.map(remainingEstimate));
}

/** Leaf items only (subtasks, or tasks without subtasks), so parents aren't double-counted. */
export function sectionProgress(s: Section): { done: number; total: number } {
  const leaves = s.tasks.flatMap((t) => (t.subtasks.length > 0 ? t.subtasks : [t]));
  return { done: leaves.filter((l) => l.done).length, total: leaves.length };
}
