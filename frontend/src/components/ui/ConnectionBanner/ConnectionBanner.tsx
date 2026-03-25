import { useState, useEffect } from 'react';
import styles from './ConnectionBanner.module.scss';

export function ConnectionBanner() {
  const [status, setStatus] = useState<'ok' | 'api-down' | 'db-down'>('ok');

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.data?.api && !data?.data?.database) {
            setStatus('db-down');
          } else {
            setStatus('api-down');
          }
        } else {
          setStatus((prev) => prev !== 'ok' ? 'ok' : prev);
        }
      } catch {
        setStatus('api-down');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'ok') return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        {status === 'db-down' ? (
          <>
            <strong>MySQL is not running.</strong> Open{' '}
            <strong>XAMPP Control Panel</strong> and click{' '}
            <strong>Start</strong> next to MySQL. This page will
            reconnect automatically.
          </>
        ) : (
          <>
            <strong>Cannot connect to the server.</strong> Please
            double-click <code>start.bat</code> in the project folder to
            start all services. This page will reconnect automatically.
          </>
        )}
      </div>
    </div>
  );
}
