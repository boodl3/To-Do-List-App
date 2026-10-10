import { useEffect, useState } from 'react';
import { usePrefs } from '../../state/selectors';
import { usePlatform } from '../app/PlatformProvider';

/** The theme actually shown: the user's choice, or the OS setting while it is `system`. */
export function useResolvedTheme(): 'light' | 'dark' {
  const { theme } = usePrefs();
  const { systemTheme } = usePlatform();
  const [systemDark, setSystemDark] = useState(() => systemTheme.prefersDark());
  useEffect(() => systemTheme.onChange(setSystemDark), [systemTheme]);
  if (theme !== 'system') return theme;
  return systemDark ? 'dark' : 'light';
}
