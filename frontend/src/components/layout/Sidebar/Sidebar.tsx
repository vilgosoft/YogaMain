import { NavLink } from 'react-router-dom';
import {
  HiOutlineSquares2X2,
  HiOutlineBookOpen,
  HiOutlineTag,
  HiOutlineUsers,
  HiOutlineBanknotes,
} from 'react-icons/hi2';
import { ROUTES } from '@/utils/constants';
import styles from './Sidebar.module.scss';

const navItems = [
  { to: ROUTES.ADMIN_DASHBOARD, icon: <HiOutlineSquares2X2 />, label: 'Dashboard' },
  { to: ROUTES.ADMIN_COURSES, icon: <HiOutlineBookOpen />, label: 'Courses' },
  { to: ROUTES.ADMIN_CATEGORIES, icon: <HiOutlineTag />, label: 'Categories' },
  { to: ROUTES.ADMIN_USERS, icon: <HiOutlineUsers />, label: 'Users' },
  { to: ROUTES.ADMIN_TRANSACTIONS, icon: <HiOutlineBanknotes />, label: 'Transactions' },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.title}>Admin Panel</div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.ADMIN_DASHBOARD}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles['link--active'] : ''}`
            }
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
