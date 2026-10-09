import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { emptyDocument } from '../../domain/defaults';
import type { AppDocument } from '../../domain/schema';
import { renderWithApp } from '../test-utils';
import { PomodoroWidget, WIDGET_SIZE } from './PomodoroWidget';

function doc(patch: Partial<AppDocument['pomodoro']> = {}): AppDocument {
  const d = emptyDocument(Date.now());
  d.pomodoro = { ...d.pomodoro, widget: { x: 100, y: 120, visible: true }, ...patch };
  return d;
}

const widget = () => screen.getByRole('region', { name: 'Pomodoro timer' });

describe('PomodoroWidget', () => {
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
      x: window.innerWidth - WIDGET_SIZE.width,
      y: 0,
    });
    act(() => {
      window.innerWidth = 600;
      window.dispatchEvent(new Event('resize'));
    });
    expect(store.getState().doc.pomodoro.widget.x).toBe(600 - WIDGET_SIZE.width);
  });

  it('moves 8 px per arrow key (24 with Shift) on the focused handle', async () => {
    const { store } = renderWithApp(<PomodoroWidget />, { doc: doc() });
    screen.getByRole('button', { name: 'Move timer' }).focus();
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}');
    expect(store.getState().doc.pomodoro.widget).toMatchObject({ x: 108, y: 144 });
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

  it('renders nothing while hidden', () => {
    renderWithApp(<PomodoroWidget />, {
      doc: doc({ widget: { x: 0, y: 0, visible: false } }),
    });
    expect(screen.queryByRole('region', { name: 'Pomodoro timer' })).toBeNull();
  });
});
