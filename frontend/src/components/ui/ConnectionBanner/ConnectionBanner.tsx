import { useState, useEffect } from 'react';
import { getApiHealth } from '@/api/config';
import { isOfflineAuthModeAvailable } from '@/api/localAuth';
import styles from './ConnectionBanner.module.scss';

export function ConnectionBanner() {
  const [status, setStatus] = useState<'ok' | 'api-down' | 'db-down' | 'offline-auth'>('ok');
  const [apiBaseUrl, setApiBaseUrl] = useState('/api');

  useEffect(() => {
    async function checkHealth() {
      const result = await getApiHealth(true);
      setApiBaseUrl(result.baseUrl);
      setStatus(result.status === 'api-down' && isOfflineAuthModeAvailable() ? 'offline-auth' : result.status);
    }

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'ok') return null;

  return (
    <div className={`${styles.banner} ${status === 'offline-auth' ? styles.bannerWarning : ''}`}>
      <div className={styles.content}>
        {status === 'db-down' ? (
          <>
            <strong>MySQL is not running.</strong> Open{' '}
            <strong>XAMPP Control Panel</strong> and click{' '}
            <strong>Start</strong> next to MySQL. This page will
            reconnect automatically.
          </>
        ) : status === 'offline-auth' ? (
          <>
            <strong>Backend offline.</strong> Login and signup will still work
            locally in this browser. When your API comes back at <code>{apiBaseUrl}</code>,
            the app will reconnect automatically.
          </>
        ) : (
          <>
            <strong>Cannot connect to the server.</strong> Please make sure
            the backend API is reachable at <code>{apiBaseUrl}</code>. This
            page will reconnect automatically.
          </>
        )}
      </div>
    </div>
  );
}
