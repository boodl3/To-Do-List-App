import styles from './SegmentedProgress.module.css';

const MAX_SEGMENTS = 20;

/** Segmented bar from the reference widgets: one segment per item, proportional past 20. */
export function SegmentedProgress({ done, total }: { done: number; total: number }) {
  const segments = Math.min(total, MAX_SEGMENTS);
  const filled = total <= MAX_SEGMENTS ? done : Math.round((done / total) * MAX_SEGMENTS);
  return (
    <div className={styles.wrap}>
      <div
        className={styles.bar}
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} done`}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={styles.segment} data-filled={i < filled || undefined} />
        ))}
      </div>
      <span className={`${styles.count} tabular-nums`} aria-hidden>
        {done}/{total}
      </span>
    </div>
  );
}
