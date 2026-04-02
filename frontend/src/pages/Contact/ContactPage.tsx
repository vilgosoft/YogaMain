import { useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { SITE_LEGAL } from '@/utils/constants';
import { HiOutlineEnvelope, HiOutlineMapPin, HiOutlinePhone } from 'react-icons/hi2';
import styles from './ContactPage.module.scss';

const DEFAULT_TITLE = 'SAI ISHANI YOGASHALA — Yoga & Meditation';

const EMAIL = 'saiishaniyogashala@gmail.com';
const PHONE_DISPLAY = '6369414153';
const PHONE_TEL = '+916369414153';
const ADDRESS = `53, Madura Garden,
Alagapuram, Periya Pudur,
Salem - 636016`;

export function ContactPage() {
  useEffect(() => {
    document.title = `Contact Us — ${SITE_LEGAL.name}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  return (
    <PageWrapper>
      <article className={styles.doc}>
        <header className={styles.hero}>
          <span className={styles.accent} aria-hidden />
          <h1 className={styles.title}>Contact us</h1>
          <p className={styles.subtitle}>
            We are here to help with enrollments, orders, and general questions. Reach us by email, phone, or
            visit our location in Salem.
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardIcon} aria-hidden>
              <HiOutlineEnvelope />
            </div>
            <p className={styles.cardLabel}>Email</p>
            <a className={styles.cardValue} href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon} aria-hidden>
              <HiOutlinePhone />
            </div>
            <p className={styles.cardLabel}>Phone</p>
            <a className={styles.cardValue} href={`tel:${PHONE_TEL}`}>
              {PHONE_DISPLAY}
            </a>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon} aria-hidden>
              <HiOutlineMapPin />
            </div>
            <p className={styles.cardLabel}>Address</p>
            <address className={`${styles.cardValue} ${styles.addressLines}`}>{ADDRESS}</address>
          </div>
        </div>

        <p className={styles.note}>
          For the quickest response, email us with your name and order or course details. We aim to reply
          within 1–2 business days.
        </p>
      </article>
    </PageWrapper>
  );
}
