import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineBars3, HiOutlineUserCircle, HiXMark } from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button/Button';
import { ROUTES } from '@/utils/constants';
import { ThemeMenuRow } from '@/components/ui/ThemeToggle/ThemeToggle';
import styles from './Navbar.module.scss';

const LOGO_SRC = '/brand/sai-ishani-logo.png';

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [profileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profileOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate(ROUTES.HOME);
  };

  const closeMobile = () => setMobileOpen(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.link} ${isActive ? styles.linkActive : ''}`.trim();

  const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.link} ${isActive || location.pathname.startsWith('/admin') ? styles.linkActive : ''}`.trim();

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link
          to={ROUTES.HOME}
          className={styles.logo}
          aria-label="SAI ISHANI YOGASHALA — Home"
          onClick={closeMobile}
        >
          <img
            src={LOGO_SRC}
            alt=""
            className={styles.logoImg}
            width={500}
            height={130}
            decoding="async"
          />
          <span className={styles.logoSrOnly}>SAI ISHANI YOGASHALA</span>
        </Link>

        <div className={`${styles.nav} ${mobileOpen ? styles['nav--open'] : ''}`}>
          <NavLink to={ROUTES.HOME} end className={linkClass} onClick={closeMobile}>
            Home
          </NavLink>
          <NavLink to={ROUTES.COURSES} className={linkClass} onClick={closeMobile}>
            Courses
          </NavLink>

          {isAuthenticated && (
            <NavLink to={ROUTES.MY_LEARNING} className={linkClass} onClick={closeMobile}>
              Dashboard
            </NavLink>
          )}

          {isAdmin && (
            <NavLink to={ROUTES.ADMIN_DASHBOARD} className={adminLinkClass} onClick={closeMobile} end>
              Admin
            </NavLink>
          )}

          {!isAuthenticated && (
            <div className={styles.navMobileAuth}>
              <Button
                variant="ghost"
                size="sm"
                className={styles.navMobileAuthBtn}
                onClick={() => {
                  navigate(ROUTES.LOGIN);
                  closeMobile();
                }}
              >
                Login
              </Button>
              <Button
                variant="primary"
                size="sm"
                className={styles.navMobileAuthBtn}
                onClick={() => {
                  navigate(ROUTES.REGISTER);
                  closeMobile();
                }}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <div className={styles.authBtns}>
            {!isAuthenticated && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.LOGIN)}>
                  Login
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.REGISTER)}>
                  Sign Up
                </Button>
              </>
            )}
          </div>

          <div className={styles.profileWrap} ref={profileWrapRef}>
            <button
              type="button"
              className={`${styles.profileTrigger} ${isAuthenticated ? styles.profileTriggerAuth : ''}`}
              onClick={() => {
                setProfileOpen((o) => !o);
                setMobileOpen(false);
              }}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-label={isAuthenticated ? 'Account menu' : 'Settings menu'}
            >
              {isAuthenticated ? (
                <span className={styles.avatar}>{user?.name?.charAt(0).toUpperCase()}</span>
              ) : (
                <HiOutlineUserCircle className={styles.profileIconGuest} aria-hidden />
              )}
            </button>

            {profileOpen && (
              <div className={styles.profileDropdown} role="menu">
                {isAuthenticated && user && (
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user.name}</span>
                    <span className={styles.dropdownEmail}>{user.email}</span>
                  </div>
                )}
                <ThemeMenuRow />
                {isAuthenticated && (
                  <button
                    type="button"
                    className={styles.dropdownLogout}
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.hamburger}
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setProfileOpen(false);
            }}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <HiXMark /> : <HiOutlineBars3 />}
          </button>
        </div>
      </div>
    </nav>
  );
}
