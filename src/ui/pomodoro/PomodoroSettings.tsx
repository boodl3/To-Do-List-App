import { Settings } from 'lucide-react';
import { useId } from 'react';
import { PomodoroSettingsSchema, type PomodoroSettings as Settings_ } from '../../domain/schema';
import { usePomodoro } from '../../state/selectors';
import { useActions } from '../app/useActions';
import menu from '../section/SectionMenu.module.css';
import styles from './PomodoroWidget.module.css';

const FIELDS: { key: keyof Omit<Settings_, 'sound'>; label: string }[] = [
  { key: 'focusMin', label: 'Focus (minutes)' },
  { key: 'shortBreakMin', label: 'Short break (minutes)' },
  { key: 'longBreakMin', label: 'Long break (minutes)' },
  { key: 'longBreakEvery', label: 'Long break every (sessions)' },
];

/** Timer settings (FR-020); new values apply from the next session. */
export function PomodoroSettings() {
  const { settings } = usePomodoro();
  const actions = useActions();
  const id = useId();
  const update = (patch: Partial<Settings_>) => {
    const parsed = PomodoroSettingsSchema.safeParse({ ...settings, ...patch });
    if (parsed.success) actions.setTimerSettings(parsed.data);
  };
  return (
    <>
      <button type="button" className={styles.icon} aria-label="Timer settings" popoverTarget={id}>
        <Settings size={16} aria-hidden />
      </button>
      <div
        id={id}
        popover="auto"
        className={menu.popover}
        role="dialog"
        aria-label="Timer settings"
      >
        {FIELDS.map(({ key, label }) => {
          const { minValue, maxValue } = PomodoroSettingsSchema.shape[key];
          return (
            <label key={key} className={menu.field}>
              {label}
              <input
                type="number"
                min={minValue ?? undefined}
                max={maxValue ?? undefined}
                defaultValue={settings[key]}
                onChange={(e) => {
                  update({ [key]: e.target.valueAsNumber });
                }}
              />
            </label>
          );
        })}
        <label className={menu.check}>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => {
              update({ sound: e.target.checked });
            }}
          />
          Sound when a session ends
        </label>
      </div>
    </>
  );
}
