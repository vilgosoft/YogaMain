import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { ROUTES, SITE_LEGAL, LEGAL_LAST_UPDATED } from '@/utils/constants';
import styles from './LegalPage.module.scss';

const DEFAULT_TITLE = 'SAI ISHANI YOGASHALA — Yoga & Meditation';

export function ShippingRefundPolicyPage() {
  useEffect(() => {
    document.title = `Shipping & Refund Policy — ${SITE_LEGAL.name}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  return (
    <PageWrapper>
      <article className={styles.doc}>
        <header className={styles.hero}>
          <span className={styles.accent} aria-hidden />
          <h1 className={styles.title}>Shipping &amp; Refund Policy</h1>
          <p className={styles.subtitle}>
            These terms apply to <strong>online prerecorded video courses</strong> offered by{' '}
            <strong>{SITE_LEGAL.name}</strong>. We do not sell physical products.
          </p>
          <span className={styles.updated}>Last updated: {LEGAL_LAST_UPDATED}</span>
        </header>

        <div className={styles.prose}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Shipping &amp; access</h2>
            <p>
              Our courses are delivered as <strong>online prerecorded videos</strong> through your account on
              this website—nothing is shipped to a postal address. Once your order is placed and payment is
              confirmed, access to your purchased videos is normally enabled within <strong>7 business days</strong>.
              Business days exclude weekends and public holidays unless we tell you otherwise.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Return policy</h2>
            <p>
              Because content is digital, there is no physical item to send back. If you are unhappy with your
              purchase, please contact us within <strong>2 days after your course access is activated</strong>{' '}
              using our <Link to={ROUTES.CONTACT}>Contact</Link> page. We will review your request in line with
              this policy and applicable law.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Refund policy</h2>
            <p>
              We <strong>do not offer refunds</strong> for purchases of our online prerecorded video courses,
              except where required by applicable law or where we explicitly agree otherwise in writing.
            </p>
            <p>
              If a refund is <strong>approved</strong> in an eligible case, the amount will be credited to your
              bank account within <strong>7 business days</strong> from approval, subject to your bank or
              payment provider&apos;s processing times.
            </p>
          </section>
        </div>
      </article>
    </PageWrapper>
  );
}
