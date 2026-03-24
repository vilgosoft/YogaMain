import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import styles from './AdminLayout.module.scss';

export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
