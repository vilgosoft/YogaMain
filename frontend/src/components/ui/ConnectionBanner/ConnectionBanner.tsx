import { useState, useEffect } from 'react';
import styles from './ConnectionBanner.module.scss';

export function ConnectionBanner() {
  const [status, setStatus] = useState<'ok' | 'api-down' | 'db-down'>('ok');

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    async function checkHealth() {
      try {
        const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.data?.api && !data?.data?.database) {
            setStatus('db-down');
          } else {
            setStatus('api-down');
          }
        } else {
          setStatus('ok');
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
            <strong>XAMPP Control Panel</strong> and click <strong>Start</strong> next
            to MySQL, then refresh this page.
          </>
        ) : (
          <>
            <strong>Cannot reach the backend server.</strong> Make sure the PHP
            server is running on port 8000. Open a terminal in the{' '}
            <code>backend</code> folder and run:{' '}
            <code>php -S localhost:8000 -t public</code>
          </>
        )}
      </div>
    </div>
  );
}
