import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { emptyDocument } from '../../domain/defaults';
import type { AppDocument, Task } from '../../domain/schema';
import { useApp } from '../../state/selectors';
import { renderWithApp } from '../test-utils';
import { TaskList } from './TaskList';

const SECTION = '40016d9b-c8cf-4068-b880-b0f78bf4bac1';
const task = (text: string, extra: Partial<Task> = {}): Task => ({
  id: crypto.randomUUID(),
  text,
  done: false,
  estimateMin: null,
  subtasks: [],
  ...extra,
});

function docWith(tasks: Task[]): AppDocument {
  const doc = emptyDocument(0);
  doc.board.sections.push({
    id: SECTION,
    title: 'S',
    accent: 'orange',
    x: 0,
    y: 0,
    width: 320,
    height: 240,
    tasks,
    createdAt: 0,
  });
  return doc;
}

function Harness() {
  const section = useApp((s) => s.doc.board.sections[0]);
  return section ? <TaskList section={section} /> : null;
}

const setup = (tasks: Task[] = []) => renderWithApp(<Harness />, { doc: docWith(tasks) });
const texts = () =>
  screen
    .queryAllByRole('textbox', { name: /^Task|^Subtask/ })
    .map((el) => (el as HTMLTextAreaElement).value);
const tasksOf = (store: ReturnType<typeof setup>['store']) =>
  store.getState().doc.board.sections[0]!.tasks;

describe('TaskList', () => {
  it('adds ten tasks from the "Add a task" row with the keyboard only (SC-002)', async () => {
    const { store } = setup();
    await userEvent.click(screen.getByRole('textbox', { name: 'Add a task' }));
    for (let i = 1; i <= 10; i++) await userEvent.keyboard(`Task ${i}{Enter}`);
    expect(tasksOf(store).map((t) => t.text)).toEqual(
      Array.from({ length: 10 }, (_, i) => `Task ${i + 1}`),
    );
    expect(screen.getByRole('textbox', { name: 'Add a task' })).toHaveFocus();
  });

  it('Enter in a task adds an empty task below and focuses it', async () => {
    const { store } = setup([task('A'), task('C')]);
    await userEvent.click(screen.getByRole('textbox', { name: 'Task A' }));
    await userEvent.keyboard('{End}{Enter}B');
    expect(screen.getByRole('textbox', { name: 'Task (untitled)' })).toHaveFocus();
    await userEvent.click(document.body); // blur commits the text
    expect(tasksOf(store).map((t) => t.text)).toEqual(['A', 'B', 'C']);
  });

  it('Tab indents and Shift+Tab outdents', async () => {
    const { store } = setup([task('A'), task('B')]);
    await userEvent.click(screen.getByRole('textbox', { name: 'Task B' }));
    await userEvent.keyboard('{Tab}');
    expect(tasksOf(store)[0]!.subtasks.map((s) => s.text)).toEqual(['B']);
    expect(screen.getByRole('textbox', { name: 'Subtask B' })).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(tasksOf(store).map((t) => t.text)).toEqual(['A', 'B']);
  });

  it('Alt+Arrow keys reorder and keep focus', async () => {
    setup([task('A'), task('B'), task('C')]);
    await userEvent.click(screen.getByRole('textbox', { name: 'Task C' }));
    await userEvent.keyboard('{Alt>}{ArrowUp}{ArrowUp}{/Alt}');
    expect(texts()).toEqual(['C', 'A', 'B']);
    expect(screen.getByRole('textbox', { name: 'Task C' })).toHaveFocus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(texts()).toEqual(['A', 'C', 'B']);
  });

  it('Space on the checkbox completes the task', async () => {
    const { store } = setup([task('A')]);
    screen.getByRole('checkbox', { name: /A/ }).focus();
    await userEvent.keyboard(' ');
    expect(tasksOf(store)[0]!.done).toBe(true);
  });

  it('Backspace on an empty task deletes it, and undo restores it', async () => {
    const { store } = setup([task('A'), task('')]);
    await userEvent.click(screen.getByRole('textbox', { name: 'Task (untitled)' }));
    await userEvent.keyboard('{Backspace}');
    expect(texts()).toEqual(['A']);
    expect(screen.getByRole('textbox', { name: 'Task A' })).toHaveFocus();
    store.getState().undo();
    expect(tasksOf(store)).toHaveLength(2);
  });

  it('delete button removes a task with its subtasks', async () => {
    const { store } = setup([
      task('A', {
        subtasks: [{ id: crypto.randomUUID(), text: 'x', done: false, estimateMin: 5 }],
      }),
    ]);
    const row = screen.getByRole('textbox', { name: 'Task A' }).closest('li')!;
    await userEvent.hover(screen.getByRole('textbox', { name: 'Task A' })); // controls appear on hover
    await userEvent.click(within(row).getAllByRole('button', { name: 'Delete A' })[0]!);
    expect(tasksOf(store)).toHaveLength(0);
  });

  it('shows the subtask sum as a read-only estimate on the parent', () => {
    setup([
      task('P', {
        estimateMin: 999,
        subtasks: [
          { id: crypto.randomUUID(), text: 'x', done: false, estimateMin: 30 },
          { id: crypto.randomUUID(), text: 'y', done: false, estimateMin: 45 },
        ],
      }),
    ]);
    expect(screen.queryByRole('textbox', { name: 'Estimate for P' })).toBeNull();
    expect(screen.getByText('1h 15m')).toBeInTheDocument();
  });

  it('renders user text literally, never as HTML', () => {
    setup([task('<b>bold</b>')]);
    expect(texts()).toEqual(['<b>bold</b>']);
    expect(document.querySelector('b')).toBeNull();
  });
});
