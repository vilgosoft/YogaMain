import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineBars3, HiXMark } from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button/Button';
import { ROUTES } from '@/utils/constants';
import styles from './Navbar.module.scss';

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link to={ROUTES.HOME} className={styles.logo}>
          <span className={styles.logoIcon}>Y</span>
          <span className={styles.logoText}>YogaLMS</span>
        </Link>

        <div className={`${styles.nav} ${mobileOpen ? styles['nav--open'] : ''}`}>
          <Link to={ROUTES.HOME} className={styles.link} onClick={() => setMobileOpen(false)}>
            Home
          </Link>
          <Link to={ROUTES.COURSES} className={styles.link} onClick={() => setMobileOpen(false)}>
            Courses
          </Link>

          {isAuthenticated && (
            <Link to={ROUTES.MY_LEARNING} className={styles.link} onClick={() => setMobileOpen(false)}>
              Dashboard
            </Link>
          )}

          {isAdmin && (
            <Link to={ROUTES.ADMIN_DASHBOARD} className={styles.link} onClick={() => setMobileOpen(false)}>
              Admin
            </Link>
          )}
        </div>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <div className={styles.avatar}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className={styles.authBtns}>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.LOGIN)}>
                Login
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.REGISTER)}>
                Sign Up
              </Button>
            </div>
          )}

          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <HiXMark /> : <HiOutlineBars3 />}
          </button>
        </div>
      </div>
    </nav>
  );
}
