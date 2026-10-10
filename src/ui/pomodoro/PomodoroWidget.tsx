import { GripVertical, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BOARD_GAP, GRID } from '../../domain/defaults';
import { durationOf, MODE_LABEL, remainingMs } from '../../domain/pomodoro';
import type { PomodoroState } from '../../domain/schema';
import { useApp, usePomodoro } from '../../state/selectors';
import { usePlatform } from '../app/PlatformProvider';
import { useActions } from '../app/useActions';
import { PomodoroSettings } from './PomodoroSettings';
import styles from './PomodoroWidget.module.css';

/** Fallback size for clamping before layout (keep in sync with --timer-width). */
export const WIDGET_SIZE = { width: 248, height: 216 };

const ACCENT = { focus: 'orange', shortBreak: 'mint', longBreak: 'sky' } as const;
const SEGMENTS = 12;

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  return `${String(m).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Re-render a few times a second while running and visible (display only; time is `endsAt`). */
function useNow(running: boolean): number {
  const { clock } = usePlatform();
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (document.visibilityState === 'visible') setNow(clock.now());
    };
    tick();
    const id = setInterval(tick, 250);
    return () => {
      clearInterval(id);
    };
  }, [running, clock]);
  return running ? now : clock.now();
}

function useLinkedTaskName(p: PomodoroState): string | null {
  return useApp((s) => {
    if (!p.linkedTaskId) return null;
    for (const section of s.doc.board.sections) {
      for (const t of section.tasks) {
        if (t.id === p.linkedTaskId) return t.text || 'Untitled task';
        const sub = t.subtasks.find((x) => x.id === p.linkedTaskId);
        if (sub) return sub.text || 'Untitled task';
      }
    }
    return null;
  });
}

/** Keep the widget inside the window (FR-019). */
function clamp(x: number, y: number, el: HTMLElement | null) {
  const w = el?.offsetWidth || WIDGET_SIZE.width;
  const h = el?.offsetHeight || WIDGET_SIZE.height;
  return {
    x: Math.round(Math.min(Math.max(0, x), Math.max(0, window.innerWidth - w))),
    y: Math.round(Math.min(Math.max(0, y), Math.max(0, window.innerHeight - h))),
  };
}

export function PomodoroWidget() {
  const p = usePomodoro();
  const actions = useActions();
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const now = useNow(p.status.kind === 'running');
  const linked = useLinkedTaskName(p);

  const { x, y, visible } = p.widget;
  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      const next = clamp(x, y, ref.current);
      if (next.x !== x || next.y !== y) actions.setWidget(next);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [x, y, visible, actions]);

  if (!visible) return null;

  const remaining = remainingMs(p, now);
  const total = durationOf(p.mode, p.settings);
  const filled = Math.round(((total - remaining) / total) * SEGMENTS);
  const pos = live ?? { x, y };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { dx: e.clientX - x, dy: e.clientY - y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag.current) setLive({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    actions.setWidget(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy, ref.current));
    drag.current = null;
    setLive(null);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? BOARD_GAP : GRID;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    actions.setWidget(clamp(x + d[0]!, y + d[1]!, ref.current));
  };

  const s = p.status.kind;
  return (
    <section
      ref={ref}
      className={styles.widget}
      data-accent={ACCENT[p.mode]}
      aria-label="Pomodoro timer"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className={styles.top}>
        <button
          type="button"
          className={styles.handle}
          aria-label="Move timer"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <GripVertical size={16} aria-hidden />
        </button>
        <span className={styles.mode}>{MODE_LABEL[p.mode]}</span>
        <span className={`${styles.today} tabular-nums`} title="Focus sessions completed today">
          Today {p.completedToday.count}
        </span>
        <PomodoroSettings />
        <button
          type="button"
          className={styles.icon}
          aria-label="Hide timer"
          onClick={() => {
            actions.setWidget({ visible: false });
          }}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className={`${styles.time} tabular-nums`} role="timer" aria-label="Time remaining">
        {formatClock(remaining)}
      </div>
      <div className={styles.bar} aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} data-filled={i < filled || undefined} />
        ))}
      </div>
      {linked && p.mode === 'focus' && <p className={styles.linked}>Focusing on {linked}</p>}
      <div className={styles.controls}>
        {s === 'idle' && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              actions.timerStart();
            }}
          >
            <Play size={16} aria-hidden /> Start
          </button>
        )}
        {s === 'running' && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              actions.timerPause();
            }}
          >
            <Pause size={16} aria-hidden /> Pause
          </button>
        )}
        {s === 'paused' && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              actions.timerResume();
            }}
          >
            <Play size={16} aria-hidden /> Resume
          </button>
        )}
        {s !== 'idle' && (
          <button
            type="button"
            className={styles.icon}
            aria-label="Reset"
            onClick={() => {
              actions.timerReset();
            }}
          >
            <RotateCcw size={16} aria-hidden />
          </button>
        )}
        <button
          type="button"
          className={styles.icon}
          aria-label="Skip"
          onClick={() => {
            actions.timerSkip();
          }}
        >
          <SkipForward size={16} aria-hidden />
        </button>
      </div>
      <span className="visually-hidden" aria-live="polite">
        {MODE_LABEL[p.mode]}
      </span>
    </section>
  );
}
