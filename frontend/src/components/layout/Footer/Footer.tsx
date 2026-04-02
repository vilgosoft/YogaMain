import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import styles from './Footer.module.scss';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to={ROUTES.HOME} className={styles.logo}>
            <img
              src="/brand/sai-ishani-logo.png"
              alt=""
              className={styles.logoImg}
              width={500}
              height={140}
              decoding="async"
            />
            <span className={styles.logoSrOnly}>SAI ISHANI YOGASHALA</span>
          </Link>
          <p className={styles.tagline}>
            Transform your practice with expert-led yoga courses.
          </p>
        </div>

        <div className={styles.links}>
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Legal</h4>
            <Link to={ROUTES.PRIVACY_POLICY}>Privacy Policy</Link>
            <Link to={ROUTES.TERMS}>Terms &amp; Conditions</Link>
            <Link to={ROUTES.SHIPPING_REFUND_POLICY}>Shipping &amp; Refund Policy</Link>
          </div>
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Contact</h4>
            <Link to={ROUTES.CONTACT}>Contact Us</Link>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} SAI ISHANI YOGASHALA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
