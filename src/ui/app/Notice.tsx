import { useEffect } from 'react';
import { useApp } from '../../state/selectors';
import styles from './Notice.module.css';

export function Notice() {
  const notice = useApp((s) => s.notice);
  const setNotice = useApp((s) => s.setNotice);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => {
      setNotice(null);
    }, 5000);
    return () => {
      clearTimeout(t);
    };
  }, [notice, setNotice]);
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {notice && <div className={styles.toast}>{notice}</div>}
    </div>
  );
}
