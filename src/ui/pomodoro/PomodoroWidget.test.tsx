import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDocument, WIDGET_DEFAULT_SIZE } from '../../domain/defaults';
import type { AppDocument } from '../../domain/schema';
import { renderWithApp } from '../test-utils';
import { PomodoroWidget } from './PomodoroWidget';

function doc(patch: Partial<AppDocument['pomodoro']> = {}): AppDocument {
  const d = emptyDocument(Date.now());
  d.pomodoro = {
    ...d.pomodoro,
    widget: { x: 100, y: 120, width: 248, height: 216, visible: true },
    ...patch,
  };
  return d;
}

const widget = () => screen.getByRole('region', { name: 'Pomodoro timer' });

describe('PomodoroWidget', () => {
  beforeEach(() => {
    window.innerWidth = 1024; // some tests shrink the window
  });

  it('shows the mode and full duration while idle', () => {
    renderWithApp(<PomodoroWidget />, { doc: doc() });
    expect(widget()).toHaveTextContent('Focus');
    expect(widget()).toHaveTextContent('25:00');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('offers the right controls for each status', async () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(store.getState().doc.pomodoro.status.kind).toBe('running');
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(store.getState().doc.pomodoro.status.kind).toBe('paused');
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(store.getState().doc.pomodoro.mode).toBe('shortBreak');
    expect(widget()).toHaveTextContent('Short break');
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(store.getState().doc.pomodoro.status.kind).toBe('idle');
  });

  it('moves when its handle is dragged and keeps the position in the store', () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    const handle = screen.getByRole('button', { name: 'Move timer' });
    fireEvent.pointerDown(handle, { clientX: 110, clientY: 130, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 210, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 210, clientY: 180, pointerId: 1 });
    expect(store.getState().doc.pomodoro.widget).toMatchObject({ x: 200, y: 170 });
  });

  it('is kept inside the window when dropped partly off-screen or the window shrinks', () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    const handle = screen.getByRole('button', { name: 'Move timer' });
    fireEvent.pointerDown(handle, { clientX: 110, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 5000, clientY: -500, pointerId: 1 });
    expect(store.getState().doc.pomodoro.widget).toMatchObject({
      x: window.innerWidth - WIDGET_DEFAULT_SIZE.width,
      y: 0,
    });
    act(() => {
      window.innerWidth = 600;
      window.dispatchEvent(new Event('resize'));
    });
    expect(store.getState().doc.pomodoro.widget.x).toBe(600 - WIDGET_DEFAULT_SIZE.width);
  });

  it('moves 8 px per arrow key (24 with Shift) on the focused handle', async () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    screen.getByRole('button', { name: 'Move timer' }).focus();
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}');
    expect(store.getState().doc.pomodoro.widget).toMatchObject({ x: 108, y: 144 });
  });

  it('resizes width and height independently from its corner, within bounds', () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    const grip = screen.getByRole('button', { name: 'Resize timer' });
    fireEvent.pointerDown(grip, { clientX: 340, clientY: 330, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 440, clientY: 370, pointerId: 1 });
    expect(widget()).toHaveStyle({ width: '348px', height: '256px' }); // live while dragging
    fireEvent.pointerUp(grip, { clientX: 440, clientY: 370, pointerId: 1 });
    expect(store.getState().doc.pomodoro.widget).toMatchObject({ width: 348, height: 256 });

    fireEvent.pointerDown(grip, { clientX: 440, clientY: 370, pointerId: 1 });
    fireEvent.pointerUp(grip, { clientX: 0, clientY: 0, pointerId: 1 });
    expect(store.getState().doc.pomodoro.widget).toMatchObject({ width: 200, height: 120 });
  });

  it('has no "Today" counter, just the mode title', () => {
    renderWithApp(<PomodoroWidget />, { doc: doc() });
    expect(widget()).not.toHaveTextContent(/Today/);
  });

  it('resizes from any edge or corner like a section; the opposite side stays put', () => {
    const { store, container } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    const handle = (dir: string) => container.querySelector(`[data-dir="${dir}"]`)!;
    // Left edge, dragged 52 px left: wider, moved left by the same amount, height unchanged.
    fireEvent.pointerDown(handle('w'), { clientX: 100, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(handle('w'), { clientX: 48, clientY: 260, pointerId: 1 });
    expect(store.getState().doc.pomodoro.widget).toMatchObject({
      x: 48,
      y: 120,
      width: 300,
      height: 216,
    });
    // Top edge, dragged 30 px down: shorter, bottom edge fixed, width unchanged.
    fireEvent.pointerDown(handle('n'), { clientX: 150, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(handle('n'), { clientX: 400, clientY: 150, pointerId: 1 });
    expect(store.getState().doc.pomodoro.widget).toMatchObject({
      x: 48,
      y: 150,
      width: 300,
      height: 186,
    });
  });

  it('resizes 8 px per arrow key (24 with Shift) on the focused grip: ←/→ width, ↑/↓ height', async () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    screen.getByRole('button', { name: 'Resize timer' }).focus();
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowRight}{/Shift}{ArrowLeft}{ArrowDown}');
    expect(store.getState().doc.pomodoro.widget).toMatchObject({
      width: 248 + 8 + 24 - 8,
      height: 216 + 8,
    });
  });

  it('never grows past the right edge of the window', () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    act(() => {
      window.innerWidth = 450;
    });
    const grip = screen.getByRole('button', { name: 'Resize timer' });
    fireEvent.pointerDown(grip, { clientX: 340, clientY: 330, pointerId: 1 });
    fireEvent.pointerUp(grip, { clientX: 1000, clientY: 330, pointerId: 1 });
    expect(store.getState().doc.pomodoro.widget.width).toBe(450 - 100); // x = 100
  });

  it('shows the linked task while focusing', () => {
    const d = doc();
    const taskId = '5e4e00e2-8b3e-4032-95ee-50b5d3882ed4';
    d.board.sections.push({
      id: '40016d9b-c8cf-4068-b880-b0f78bf4bac1',
      title: 'S',
      accent: 'orange',
      x: 0,
      y: 0,
      width: 320,
      height: 240,
      createdAt: 0,
      tasks: [{ id: taskId, text: 'Problem set', done: false, estimateMin: null, subtasks: [] }],
    });
    d.pomodoro.linkedTaskId = taskId;
    renderWithApp(<PomodoroWidget />, { doc: d });
    expect(widget()).toHaveTextContent('Focusing on Problem set');
  });

  it('runs for the linked task estimate; "Complete task" ticks it and starts the break', async () => {
    const d = doc();
    const taskId = '5e4e00e2-8b3e-4032-95ee-50b5d3882ed4';
    d.board.sections.push({
      id: '40016d9b-c8cf-4068-b880-b0f78bf4bac1',
      title: 'S',
      accent: 'orange',
      x: 0,
      y: 0,
      width: 320,
      height: 240,
      createdAt: 0,
      tasks: [{ id: taskId, text: 'Essay', done: false, estimateMin: 50, subtasks: [] }],
    });
    d.pomodoro.linkedTaskId = taskId;
    const { store } = renderWithApp(<PomodoroWidget />, { doc: d });
    expect(widget()).toHaveTextContent('50:00');
    expect(screen.queryByRole('button', { name: 'Complete task' })).toBeNull(); // idle
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    await userEvent.click(screen.getByRole('button', { name: 'Complete task' }));
    const s = store.getState().doc;
    expect(s.board.sections[0]!.tasks[0]!.done).toBe(true);
    expect(s.pomodoro).toMatchObject({ mode: 'shortBreak', linkedTaskId: null });
    expect(s.pomodoro.status.kind).toBe('running');
    expect(s.pomodoro.completedToday.count).toBe(1);
  });

  it('renders nothing while hidden', () => {
    renderWithApp(<PomodoroWidget />, {
      doc: doc({ widget: { x: 0, y: 0, width: 248, height: 216, visible: false } }),
    });
    expect(screen.queryByRole('region', { name: 'Pomodoro timer' })).toBeNull();
  });
});
