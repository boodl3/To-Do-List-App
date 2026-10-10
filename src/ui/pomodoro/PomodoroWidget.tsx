import { CircleCheck, GripVertical, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { BOARD_GAP, GRID } from '../../domain/defaults';
import { durationOf, MODE_LABEL, remainingMs } from '../../domain/pomodoro';
import { itemEstimate } from '../../domain/rollup';
import { WIDGET_HEIGHT, WIDGET_WIDTH, type PomodoroState } from '../../domain/schema';
import { findItem } from '../../domain/tasks';
import { useApp, usePomodoro } from '../../state/selectors';
import { usePlatform } from '../app/PlatformProvider';
import { useActions } from '../app/useActions';
import { PomodoroSettings } from './PomodoroSettings';
import styles from './PomodoroWidget.module.css';

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

/** The linked task's name and estimate (the focus length), as two primitive selections. */
function useLinkedTask(p: PomodoroState) {
  const find = (board: Parameters<typeof findItem>[0]) =>
    p.linkedTaskId ? findItem(board, p.linkedTaskId)?.item : undefined;
  const name = useApp((s) => {
    const item = find(s.doc.board);
    return item ? item.text || 'Untitled task' : null;
  });
  const estimate = useApp((s) => {
    const item = find(s.doc.board);
    return item ? itemEstimate(item) : null;
  });
  return { name, estimate };
}

/** Keep the widget inside the window (FR-019). The rendered size wins: content can stretch it. */
function clamp(
  x: number,
  y: number,
  size: { width: number; height: number },
  el: HTMLElement | null,
) {
  const w = el?.offsetWidth || size.width;
  const h = el?.offsetHeight || size.height;
  return {
    x: Math.round(Math.min(Math.max(0, x), Math.max(0, window.innerWidth - w))),
    y: Math.round(Math.min(Math.max(0, y), Math.max(0, window.innerHeight - h))),
  };
}

/** Within `bounds`, and no larger than the `room` left in the window. */
function clampSize(value: number, bounds: { min: number; max: number }, room: number) {
  const max = Math.max(bounds.min, Math.min(bounds.max, room));
  return Math.round(Math.min(Math.max(value, bounds.min), max));
}

type Rect = { x: number; y: number; w: number; h: number };
/** -1 = left/top side, 1 = right/bottom side, 0 = that axis isn't dragged. */
type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

/** Resize handles like a section's (React Flow NodeResizer): four edges and four corners. */
const HANDLES: Record<string, Dir> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  sw: { x: -1, y: 1 },
  se: { x: 1, y: 1 },
};

/**
 * Resize from a handle dragged by (dx, dy), width and height independently. The opposite side
 * stays put, the result stays inside the window, and it is never shorter than `minH` (the
 * content's own height: text keeps its size, so the layout can't shrink below it).
 */
function resizeFrom(start: Rect, dir: Dir, dx: number, dy: number, minH = 0) {
  const roomX = dir.x < 0 ? start.x + start.w : window.innerWidth - start.x;
  const roomY = dir.y < 0 ? start.y + start.h : window.innerHeight - start.y;
  const heights = { min: Math.max(WIDGET_HEIGHT.min, minH), max: WIDGET_HEIGHT.max };
  const w = dir.x ? clampSize(start.w + dir.x * dx, WIDGET_WIDTH, roomX) : start.w;
  const h = dir.y ? clampSize(start.h + dir.y * dy, heights, roomY) : start.h;
  return {
    x: Math.round(dir.x < 0 ? start.x + start.w - w : start.x),
    y: Math.round(dir.y < 0 ? start.y + start.h - h : start.y),
    width: w,
    height: h,
  };
}

/** The content's own height: lay out at height 0 and let `min-height: min-content` win. */
function contentHeight(el: HTMLElement | null): number {
  if (!el) return 0;
  const previous = el.style.height;
  el.style.height = '0px';
  const h = el.offsetHeight;
  el.style.height = previous;
  return h;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function PomodoroWidget() {
  const p = usePomodoro();
  const actions = useActions();
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const sizing = useRef<{ px: number; py: number; start: Rect; dir: Dir; minH: number } | null>(
    null,
  );
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const [liveSize, setLiveSize] = useState<ReturnType<typeof resizeFrom> | null>(null);
  const now = useNow(p.status.kind === 'running');
  const { name: linked, estimate } = useLinkedTask(p);

  const { x, y, width, height, visible } = p.widget;
  // Re-clamp after a resize of the widget (it grows downwards too) or of the window.
  useLayoutEffect(() => {
    if (!visible) return;
    const reclamp = () => {
      const next = clamp(x, y, { width, height }, ref.current);
      if (next.x !== x || next.y !== y) actions.setWidget(next);
    };
    reclamp();
    window.addEventListener('resize', reclamp);
    return () => {
      window.removeEventListener('resize', reclamp);
    };
  }, [x, y, width, height, visible, actions]);

  if (!visible) return null;

  const remaining = remainingMs(p, now, estimate);
  const total = Math.max(remaining, durationOf(p.mode, p.settings, estimate));
  const filled = Math.round(((total - remaining) / total) * SEGMENTS);
  const pos = liveSize ?? live ?? { x, y };
  const size = liveSize ?? { width, height };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { dx: e.clientX - x, dy: e.clientY - y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag.current) setLive({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    actions.setWidget(
      clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy, size, ref.current),
    );
    drag.current = null;
    setLive(null);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    const step = e.shiftKey ? BOARD_GAP : GRID;
    actions.setWidget(clamp(x + d[0] * step, y + d[1] * step, size, ref.current));
  };

  // Resize handles (edges and corners), like a section's.
  const resizeHandlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const dir = HANDLES[e.currentTarget.dataset.dir ?? ''];
      if (!dir) return;
      const h = ref.current?.offsetHeight || height;
      const minH = contentHeight(ref.current);
      sizing.current = { px: e.clientX, py: e.clientY, start: { x, y, w: width, h }, dir, minH };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const sz = sizing.current;
      if (sz)
        setLiveSize(resizeFrom(sz.start, sz.dir, e.clientX - sz.px, e.clientY - sz.py, sz.minH));
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const sz = sizing.current;
      if (!sz) return;
      actions.setWidget(
        resizeFrom(sz.start, sz.dir, e.clientX - sz.px, e.clientY - sz.py, sz.minH),
      );
      sizing.current = null;
      setLiveSize(null);
    },
  };
  // Keyboard, from the bottom-right corner: left/right narrower/wider, up/down shorter/taller.
  const onResizeKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    const step = e.shiftKey ? BOARD_GAP : GRID;
    const start = { x, y, w: width, h: ref.current?.offsetHeight || height };
    actions.setWidget(
      resizeFrom(start, { x: 1, y: 1 }, d[0] * step, d[1] * step, contentHeight(ref.current)),
    );
  };

  const s = p.status.kind;
  return (
    <section
      ref={ref}
      className={styles.widget}
      data-resizing={liveSize ? '' : undefined}
      data-accent={ACCENT[p.mode]}
      aria-label="Pomodoro timer"
      style={{ left: pos.x, top: pos.y, ...size }}
    >
      <div className={styles.card}>
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
        {/* Takes any extra height, keeping the clock centred; text never scales. */}
        <div className={styles.face}>
          <div className={`${styles.time} tabular-nums`} role="timer" aria-label="Time remaining">
            {formatClock(remaining)}
          </div>
          <div className={styles.bar} aria-hidden>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} data-filled={i < filled || undefined} />
            ))}
          </div>
          {linked && p.mode === 'focus' && <p className={styles.linked}>Focusing on {linked}</p>}
        </div>
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
          {s !== 'idle' && p.mode === 'focus' && (
            <button
              type="button"
              className={styles.icon}
              aria-label={linked ? 'Complete task' : 'Complete session'}
              title={
                linked ? 'Complete task and start the break' : 'Finish early and start the break'
              }
              onClick={() => {
                actions.timerCompleteTask();
              }}
            >
              <CircleCheck size={16} aria-hidden />
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
      </div>
      {Object.keys(HANDLES)
        .filter((name) => name !== 'se')
        .map((name) => (
          <span key={name} className={styles.resize} data-dir={name} {...resizeHandlers} />
        ))}
      {/* The bottom-right corner is also the keyboard way in (Constitution IV). */}
      <button
        type="button"
        className={styles.resize}
        data-dir="se"
        aria-label="Resize timer"
        title="Resize (arrow keys)"
        {...resizeHandlers}
        onKeyDown={onResizeKey}
      />
    </section>
  );
}
