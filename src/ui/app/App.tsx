import { ReactFlowProvider } from '@xyflow/react';
import { LayoutGrid, Plus, Timer } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { startFresh } from '../../state/boot';
import { useApp, useAppStore } from '../../state/selectors';
import { BoardCanvas } from '../board/BoardCanvas';
import { EmptyBoard } from '../board/EmptyBoard';
import { useAddSection } from '../board/useAddSection';
import { useVisibleRect } from '../board/useVisibleRect';
import { PomodoroWidget } from '../pomodoro/PomodoroWidget';
import { ConfirmDeleteDialog } from '../section/ConfirmDeleteDialog';
import { PinButton } from '../toolbar/PinButton';
import { ThemeToggle } from '../toolbar/ThemeToggle';
import { IconButton, Toolbar } from '../toolbar/Toolbar';
import { useResolvedTheme } from '../theme/useResolvedTheme';
import { Notice } from './Notice';
import { usePlatform } from './PlatformProvider';
import { useGlobalShortcuts } from './shortcuts';
import { useActions } from './useActions';
import styles from './App.module.css';

function LoadErrorDialog({ error }: { error: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const platform = usePlatform();
  const store = useAppStore();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="load-error-title">
      <h2 id="load-error-title">Your board couldn't be opened</h2>
      <p>The saved files were kept untouched. Details:</p>
      <pre className={styles.details}>{error}</pre>
      <button
        type="button"
        className={styles.primary}
        onClick={() => {
          startFresh(platform, store);
        }}
      >
        Start fresh
      </button>
    </dialog>
  );
}

function Workspace() {
  const addSection = useAddSection();
  // Cold-start gate (Constitution V): measured from process start to this mark (T116).
  useEffect(() => {
    performance.mark('board-ready');
  }, []);
  const actions = useActions();
  const visible = useVisibleRect();
  const empty = useApp((s) => s.doc.board.sections.length === 0);
  const timerVisible = useApp((s) => s.doc.pomodoro.widget.visible);
  return (
    <>
      <Toolbar
        start={
          <IconButton label="New section" onClick={addSection}>
            <Plus size={18} aria-hidden />
          </IconButton>
        }
        overflow={
          <>
            <IconButton
              label="Tidy up"
              disabled={empty}
              onClick={() => {
                actions.tidyUp(visible().width);
              }}
            >
              <LayoutGrid size={18} aria-hidden />
            </IconButton>
            <ThemeToggle />
            <PinButton />
          </>
        }
        end={
          <>
            <IconButton
              label="Timer"
              pressed={timerVisible}
              onClick={() => {
                actions.setWidget({ visible: !timerVisible });
              }}
            >
              <Timer size={18} aria-hidden />
            </IconButton>
          </>
        }
      />
      <main className={styles.board} aria-label="Board">
        <BoardCanvas />
        {empty && <EmptyBoard onAdd={addSection} />}
      </main>
      <PomodoroWidget />
      <ConfirmDeleteDialog />
      <Notice />
    </>
  );
}

export function App() {
  const status = useApp((s) => s.status);
  const error = useApp((s) => s.error);
  const theme = useResolvedTheme();
  useGlobalShortcuts();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (status === 'loading') return null;
  if (status === 'error') return <LoadErrorDialog error={error ?? 'Unknown error'} />;
  return (
    <ReactFlowProvider>
      <Workspace />
    </ReactFlowProvider>
  );
}
