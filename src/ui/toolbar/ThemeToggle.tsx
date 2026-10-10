import { Moon, Sun } from 'lucide-react';
import type { MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { useApp } from '../../state/selectors';
import { useResolvedTheme } from '../theme/useResolvedTheme';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark';

/** Sun = light, moon = dark (FR-026). The active theme's icon is pressed. */
export function ThemeToggle() {
  const active = useResolvedTheme();
  const updatePrefs = useApp((s) => s.updatePrefs);

  const choose = (theme: Theme, e: MouseEvent<HTMLButtonElement>) => {
    const apply = () => {
      updatePrefs((p) => ({ ...p, theme }));
    };
    if (
      theme === active ||
      !('startViewTransition' in document) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      apply();
      return;
    }
    // The new theme grows as a circle from the button (themes.css `theme-reveal`). Percentages,
    // not px: Chromium scales px clip-paths on the snapshot by the device pixel ratio.
    const b = e.currentTarget.getBoundingClientRect();
    const [w, h] = [innerWidth, innerHeight];
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    const root = document.documentElement;
    root.style.setProperty('--reveal-x', `${(x / w) * 100}%`);
    root.style.setProperty('--reveal-y', `${(y / h) * 100}%`);
    // A circle's % radius is relative to the box diagonal / √2.
    root.style.setProperty('--reveal-r', `${(radius / (Math.hypot(w, h) / Math.SQRT2)) * 100}%`);
    document.startViewTransition(() => {
      flushSync(apply);
      root.dataset.theme = theme; // App's effect does this too; the snapshot needs it now
    });
  };

  return (
    <div className={styles.toggle} role="group" aria-label="Theme" data-active={active}>
      <button
        type="button"
        className={`${styles.option} ${styles.sun}`}
        aria-label="Light mode"
        title="Light mode"
        aria-pressed={active === 'light'}
        onClick={(e) => {
          choose('light', e);
        }}
      >
        <Sun size={16} aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.option} ${styles.moon}`}
        aria-label="Dark mode"
        title="Dark mode"
        aria-pressed={active === 'dark'}
        onClick={(e) => {
          choose('dark', e);
        }}
      >
        <Moon size={16} aria-hidden />
      </button>
    </div>
  );
}
