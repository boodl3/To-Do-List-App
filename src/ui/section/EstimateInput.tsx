import { useId, useState } from 'react';
import { formatEstimate, parseEstimate } from '../../domain/estimate';
import styles from './EstimateInput.module.css';

/** Free-text estimate field (FR-012): validates on blur, keeps the last valid value. */
export function EstimateInput({
  value,
  onCommit,
  label,
}: {
  value: number | null;
  onCommit: (minutes: number | null) => void;
  label: string;
}) {
  const formatted = formatEstimate(value ?? 0);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const commit = () => {
    if (draft === null) return;
    const parsed = parseEstimate(draft);
    setDraft(null);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    if (parsed.value !== value) onCommit(parsed.value);
  };

  return (
    <span className={styles.wrap}>
      <input
        className={`${styles.input} nodrag tabular-nums`}
        value={draft ?? formatted}
        placeholder="—"
        aria-label={label}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setDraft(null);
            setError(null);
          }
        }}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </span>
  );
}
