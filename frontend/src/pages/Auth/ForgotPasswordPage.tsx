import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import { forgotPassword } from '@/api/auth.api';
import { useToast } from '@/components/ui/Toast/Toast';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { ROUTES } from '@/utils/constants';
import { isValidEmail } from '@/utils/validators';
import styles from './AuthPage.module.scss';

export function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Invalid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
      showToast('success', 'Check your email for reset instructions.');
    } catch {
      showToast('error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Reset password</h2>
          <p>Enter your email and we&apos;ll send you a link to choose a new password.</p>
        </div>

        {submitted ? (
          <p className={styles.switchAuth} style={{ textAlign: 'left' }}>
            If an account exists for that address, you should receive an email shortly. Then return to{' '}
            <Link to={ROUTES.LOGIN}>Sign in</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              icon={<HiOutlineEnvelope />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" fullWidth isLoading={loading}>
              Send reset link
            </Button>
          </form>
        )}

        <p className={styles.switchAuth}>
          <Link to={ROUTES.LOGIN}>Back to sign in</Link>
        </p>
      </div>

      <div className={styles.artwork}>
        <div className={styles.artworkContent}>
          <h1>
            Back to Your <span className="text-gradient">Practice</span>
          </h1>
          <p>Secure access to your courses and progress—reset your password anytime.</p>
        </div>
      </div>
    </div>
  );
}
