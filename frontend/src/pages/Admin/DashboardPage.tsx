import { useState, useEffect } from 'react';
import { HiOutlineUsers, HiOutlineBookOpen, HiOutlineAcademicCap, HiOutlineBanknotes, HiOutlineFilm } from 'react-icons/hi2';
import { getDashboardStats } from '@/api/admin.api';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './DashboardPage.module.scss';

interface StatCard {
  key: string;
  label: string;
  icon: React.ReactNode;
  format?: (val: number) => string;
}

const statCards: StatCard[] = [
  { key: 'total_users', label: 'Total Users', icon: <HiOutlineUsers /> },
  { key: 'total_courses', label: 'Published Courses', icon: <HiOutlineBookOpen /> },
  { key: 'total_videos', label: 'Total Videos', icon: <HiOutlineFilm /> },
  { key: 'total_enrollments', label: 'Enrollments', icon: <HiOutlineAcademicCap /> },
  { key: 'total_revenue', label: 'Total Revenue', icon: <HiOutlineBanknotes />, format: (v) => `₹${v.toLocaleString('en-IN')}` },
];

export function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={styles.center}><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <h2 className={styles.title}>Dashboard</h2>
      <div className={styles.grid}>
        {statCards.map((card) => (
          <div key={card.key} className={styles.card}>
            <div className={styles.cardIcon}>{card.icon}</div>
            <div className={styles.cardInfo}>
              <span className={styles.cardValue}>
                {card.format ? card.format(stats[card.key] ?? 0) : (stats[card.key] ?? 0)}
              </span>
              <span className={styles.cardLabel}>{card.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
