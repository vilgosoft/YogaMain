import { useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { SITE_LEGAL, LEGAL_LAST_UPDATED } from '@/utils/constants';
import styles from './LegalPage.module.scss';

const DEFAULT_TITLE = 'SAI ISHANI YOGASHALA — Yoga & Meditation';

export function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = `Privacy Policy — ${SITE_LEGAL.name}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  return (
    <PageWrapper>
      <article className={styles.doc}>
        <header className={styles.hero}>
          <span className={styles.accent} aria-hidden />
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.subtitle}>
            This website is owned and operated by <strong>{SITE_LEGAL.name}</strong>.
          </p>
          <span className={styles.updated}>Last updated: {LEGAL_LAST_UPDATED}</span>
        </header>

        <div className={styles.prose}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Information we collect</h2>
            <ul>
              <li>
                <strong>Personal information:</strong> We collect details such as your name, email address,
                phone number, and payment-related information when you register, purchase a course, or contact
                us. For physical goods (if offered), we may also collect a delivery address.
              </li>
              <li>
                <strong>Non-personal information:</strong> We may collect data such as browser type, device
                type, and general usage patterns to improve our website and services.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. How we use your information</h2>
            <ul>
              <li>
                <strong>To provide services:</strong> We use your information to create and manage your
                account, process enrollments and payments, and deliver course access.
              </li>
              <li>
                <strong>To communicate:</strong> We use your contact details to send service-related messages,
                respond to inquiries, and—if you have opted in—occasional promotional updates.
              </li>
              <li>
                <strong>To improve our services:</strong> We analyse aggregated, non-personal information to
                understand how the platform is used and to enhance performance and content.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Information sharing</h2>
            <ul>
              <li>
                <strong>Service providers:</strong> We may share information with trusted third parties who
                help us operate the site, process payments (for example, payment gateways), host content, or
                send communications—only as needed for those services.
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose information if required by law or to
                protect our rights, users, or the integrity of the platform.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Data security</h2>
            <p>
              We implement reasonable technical and organisational measures to protect your personal
              information against unauthorised access, alteration, disclosure, or loss. No method of
              transmission over the internet is completely secure; we encourage you to use a strong password
              and keep your login details confidential.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Your rights</h2>
            <ul>
              <li>
                <strong>Access and correction:</strong> You may request access to or correction of your
                personal data where applicable. You can update certain details through your account on this
                website.
              </li>
              <li>
                <strong>Opt-out:</strong> You can opt out of promotional emails by using the unsubscribe link
                in those messages, where provided.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page, and
              the &quot;Last updated&quot; date at the top will be revised accordingly. Continued use of the
              site after changes constitutes acceptance of the updated policy, to the extent permitted by law.
            </p>
          </section>
        </div>
      </article>
    </PageWrapper>
  );
}
