import type { Section, Subtask, Task } from './schema';

/**
 * Task-list operations on one section (FR-010 – FR-015). Every function returns the same
 * section object when nothing changed, so the store records no empty undo steps.
 *
 * Invariant (data-model "Task completion"): a task with subtasks is done exactly when all of its
 * subtasks are done. `withTasks` restores it after every operation.
 */
const MAX_TEXT = 500;

function syncParent(t: Task): Task {
  if (t.subtasks.length === 0) return t;
  const done = t.subtasks.every((s) => s.done);
  return done === t.done ? t : { ...t, done };
}

function withTasks(section: Section, tasks: Task[]): Section {
  return { ...section, tasks: tasks.map(syncParent) };
}

function locate(section: Section, id: string) {
  for (const [ti, t] of section.tasks.entries()) {
    if (t.id === id) return { ti, si: -1 };
    const si = t.subtasks.findIndex((s) => s.id === id);
    if (si !== -1) return { ti, si };
  }
  return null;
}

/** Apply `fn` to the task or subtask with `id`; same section back when it returns its input. */
function mapItem(section: Section, id: string, fn: <T extends Task | Subtask>(item: T) => T) {
  const at = locate(section, id);
  if (!at) return section;
  const task = section.tasks[at.ti]!;
  let next: Task;
  if (at.si === -1) {
    next = fn(task);
  } else {
    const s = task.subtasks[at.si]!;
    const ns = fn(s);
    if (ns === s) return section;
    next = { ...task, subtasks: task.subtasks.with(at.si, ns) };
  }
  if (next === task) return section;
  return withTasks(section, section.tasks.with(at.ti, next));
}

const insertAfter = <T extends { id: string }>(list: T[], item: T, afterId?: string) => {
  const i = afterId === undefined ? -1 : list.findIndex((x) => x.id === afterId);
  return i === -1 ? [...list, item] : list.toSpliced(i + 1, 0, item);
};

export function addTask(section: Section, id: string, text: string, afterId?: string): Section {
  const task: Task = {
    id,
    text: text.slice(0, MAX_TEXT),
    done: false,
    estimateMin: null,
    subtasks: [],
  };
  return withTasks(section, insertAfter(section.tasks, task, afterId));
}

export function addSubtask(
  section: Section,
  parentId: string,
  id: string,
  text: string,
  afterId?: string,
): Section {
  const sub: Subtask = { id, text: text.slice(0, MAX_TEXT), done: false, estimateMin: null };
  return withTasks(
    section,
    section.tasks.map((t) =>
      t.id === parentId ? { ...t, subtasks: insertAfter(t.subtasks, sub, afterId) } : t,
    ),
  );
}

export function editText(section: Section, id: string, text: string): Section {
  const value = text.slice(0, MAX_TEXT);
  return mapItem(section, id, (item) => (item.text === value ? item : { ...item, text: value }));
}

export function setEstimate(section: Section, id: string, estimateMin: number | null): Section {
  return mapItem(section, id, (item) =>
    item.estimateMin === estimateMin ? item : { ...item, estimateMin },
  );
}

export function toggleDone(section: Section, id: string): Section {
  const at = locate(section, id);
  if (!at) return section;
  const task = section.tasks[at.ti]!;
  let next: Task;
  if (at.si === -1) {
    const done = !task.done;
    next = { ...task, done, subtasks: task.subtasks.map((s) => ({ ...s, done })) };
  } else {
    const s = task.subtasks[at.si]!;
    next = { ...task, subtasks: task.subtasks.with(at.si, { ...s, done: !s.done }) };
  }
  return withTasks(section, section.tasks.with(at.ti, next));
}

export function deleteItem(section: Section, id: string): Section {
  const at = locate(section, id);
  if (!at) return section;
  if (at.si === -1) return withTasks(section, section.tasks.toSpliced(at.ti, 1));
  const task = section.tasks[at.ti]!;
  return withTasks(
    section,
    section.tasks.with(at.ti, { ...task, subtasks: task.subtasks.toSpliced(at.si, 1) }),
  );
}

/** Make a task the last subtask of the task above. One level only (FR-011). */
export function indent(section: Section, id: string): Section {
  const at = locate(section, id);
  if (!at || at.si !== -1 || at.ti === 0) return section;
  const task = section.tasks[at.ti]!;
  if (task.subtasks.length > 0) return section;
  const parent = section.tasks[at.ti - 1]!;
  const sub: Subtask = {
    id: task.id,
    text: task.text,
    done: task.done,
    estimateMin: task.estimateMin,
  };
  const tasks = section.tasks
    .with(at.ti - 1, { ...parent, subtasks: [...parent.subtasks, sub] })
    .toSpliced(at.ti, 1);
  return withTasks(section, tasks);
}

/** Turn a subtask into a task placed right after its parent. */
export function outdent(section: Section, id: string): Section {
  const at = locate(section, id);
  if (!at || at.si === -1) return section;
  const parent = section.tasks[at.ti]!;
  const s = parent.subtasks[at.si]!;
  const task: Task = { ...s, subtasks: [] };
  const tasks = section.tasks
    .with(at.ti, { ...parent, subtasks: parent.subtasks.toSpliced(at.si, 1) })
    .toSpliced(at.ti + 1, 0, task);
  return withTasks(section, tasks);
}

/** Move an item to `toIndex` within its own list (tasks, or its parent's subtasks). */
export function moveItem(section: Section, id: string, toIndex: number): Section {
  const at = locate(section, id);
  if (!at) return section;
  const move = <T>(list: T[], from: number): T[] => {
    const to = Math.max(0, Math.min(list.length - 1, toIndex));
    if (to === from) return list;
    const item = list[from]!;
    return list.toSpliced(from, 1).toSpliced(to, 0, item);
  };
  if (at.si === -1) {
    const tasks = move(section.tasks, at.ti);
    return tasks === section.tasks ? section : withTasks(section, tasks);
  }
  const task = section.tasks[at.ti]!;
  const subtasks = move(task.subtasks, at.si);
  return subtasks === task.subtasks
    ? section
    : withTasks(section, section.tasks.with(at.ti, { ...task, subtasks }));
}

/** Index of an item in its own list, for keyboard reordering. */
export function indexOfItem(section: Section, id: string): number {
  const at = locate(section, id);
  if (!at) return -1;
  return at.si === -1 ? at.ti : at.si;
}
