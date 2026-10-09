import { Moon, Sun } from 'lucide-react';
import { useApp } from '../../state/selectors';
import { useResolvedTheme } from '../theme/useResolvedTheme';
import styles from './ThemeToggle.module.css';

/** Sun = light, moon = dark (FR-026). The active theme's icon is pressed. */
export function ThemeToggle() {
  const active = useResolvedTheme();
  const updatePrefs = useApp((s) => s.updatePrefs);
  const choose = (theme: 'light' | 'dark') => {
    updatePrefs((p) => ({ ...p, theme }));
  };
  return (
    <div className={styles.toggle} role="group" aria-label="Theme">
      <button
        type="button"
        className={styles.option}
        aria-label="Light mode"
        title="Light mode"
        aria-pressed={active === 'light'}
        onClick={() => {
          choose('light');
        }}
      >
        <Sun size={16} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.option}
        aria-label="Dark mode"
        title="Dark mode"
        aria-pressed={active === 'dark'}
        onClick={() => {
          choose('dark');
        }}
      >
        <Moon size={16} aria-hidden />
      </button>
    </div>
  );
}
