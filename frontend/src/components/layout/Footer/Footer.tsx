import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import styles from './Footer.module.scss';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>Y</span>
            <span>YogaLMS</span>
          </div>
          <p className={styles.tagline}>
            Transform your practice with expert-led yoga courses.
          </p>
        </div>

        <div className={styles.links}>
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Platform</h4>
            <Link to={ROUTES.COURSES}>Browse Courses</Link>
            <Link to={ROUTES.REGISTER}>Get Started</Link>
          </div>
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Support</h4>
            <Link to="#">Help Center</Link>
            <Link to="#">Contact Us</Link>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} YogaLMS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
