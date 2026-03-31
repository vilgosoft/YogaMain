import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineAcademicCap,
  HiOutlinePlayCircle,
  HiOutlineEllipsisHorizontal,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserPlus,
} from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';
import { ThemeMenuRow } from '@/components/ui/ThemeToggle/ThemeToggle';
import styles from './MobileBottomNav.module.scss';

function useBottomNavVisible(): boolean {
  const { pathname } = useLocation();
  if (pathname.startsWith('/player/')) return false;
  if (pathname.startsWith('/admin')) return false;
  return true;
}

export function MobileBottomNav() {
  const visible = useBottomNavVisible();
  const location = useLocation();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      document.documentElement.removeAttribute('data-bottom-nav');
      return;
    }
    document.documentElement.setAttribute('data-bottom-nav', 'true');
    return () => document.documentElement.removeAttribute('data-bottom-nav');
  }, [visible]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  if (!visible) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.tab} ${isActive ? styles.tabActive : ''}`.trim();

  const go = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  return (
    <>
      <nav className={styles.bar} aria-label="Main navigation">
        <NavLink to={ROUTES.HOME} end className={linkClass}>
          <HiOutlineHome className={styles.icon} aria-hidden />
          <span>Home</span>
        </NavLink>
        <NavLink to={ROUTES.COURSES} className={linkClass}>
          <HiOutlineAcademicCap className={styles.icon} aria-hidden />
          <span>Courses</span>
        </NavLink>
        <NavLink
          to={isAuthenticated ? ROUTES.MY_LEARNING : ROUTES.LOGIN}
          className={linkClass}
        >
          <HiOutlinePlayCircle className={styles.icon} aria-hidden />
          <span>{isAuthenticated ? 'Learn' : 'Sign in'}</span>
        </NavLink>
        <button
          type="button"
          className={`${styles.tab} ${moreOpen ? styles.tabActive : ''}`}
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          aria-label="More options"
        >
          <HiOutlineEllipsisHorizontal className={styles.icon} aria-hidden />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <button
            type="button"
            className={styles.sheetBackdrop}
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className={styles.sheet} role="dialog" aria-label="More menu">
            <div className={styles.sheetHandle} aria-hidden />
            <div className={styles.sheetBody}>
              <ThemeMenuRow className={styles.sheetTheme} />
              {isAdmin && (
                <button type="button" className={styles.sheetBtn} onClick={() => go(ROUTES.ADMIN_DASHBOARD)}>
                  Admin dashboard
                </button>
              )}
              {!isAuthenticated ? (
                <>
                  <button type="button" className={styles.sheetBtn} onClick={() => go(ROUTES.LOGIN)}>
                    <HiOutlineArrowRightOnRectangle className={styles.sheetBtnIcon} aria-hidden />
                    Log in
                  </button>
                  <button type="button" className={styles.sheetBtnPrimary} onClick={() => go(ROUTES.REGISTER)}>
                    <HiOutlineUserPlus className={styles.sheetBtnIcon} aria-hidden />
                    Create account
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.sheetBtnDanger}
                  onClick={async () => {
                    setMoreOpen(false);
                    await logout();
                    navigate(ROUTES.HOME);
                  }}
                >
                  Log out
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
