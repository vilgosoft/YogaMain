import { useTheme } from '@/context/ThemeContext';
import styles from './ThemeToggle.module.scss';

/** Theme switch row for use inside menus (e.g. profile dropdown). */
export function ThemeMenuRow() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      className={styles.menuRow}
      onClick={toggleTheme}
      role="menuitem"
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      <span className={styles.menuLabel}>
        <span className={styles.menuTitle}>Appearance</span>
        <span className={styles.menuHint}>{isLight ? 'Light mode' : 'Dark mode'}</span>
      </span>
      <span className={styles.track} data-active={isLight ? 'true' : 'false'} aria-hidden>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
