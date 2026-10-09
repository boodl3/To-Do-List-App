import { useEffect, useRef } from 'react';
import { startFresh } from '../../state/boot';
import { useApp, useAppStore } from '../../state/selectors';
import { Toolbar } from '../toolbar/Toolbar';
import { useResolvedTheme } from '../theme/useResolvedTheme';
import { Notice } from './Notice';
import { usePlatform } from './PlatformProvider';
import { useGlobalShortcuts } from './shortcuts';
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
    <>
      <Toolbar />
      <main className={styles.board} aria-label="Board" />
      <Notice />
    </>
  );
}
