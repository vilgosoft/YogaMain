import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HiOutlineLockClosed } from 'react-icons/hi2';
import { resetPassword } from '@/api/auth.api';
import { useToast } from '@/components/ui/Toast/Toast';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { ROUTES } from '@/utils/constants';
import { isStrongPassword } from '@/utils/validators';
import { getApiErrorMessage } from '@/utils/apiErrors';
import styles from './AuthPage.module.scss';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = 'Password is required';
    else {
      const pwErr = isStrongPassword(password);
      if (pwErr) errs.password = pwErr;
    }
    if (password !== confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword(token, password);
      showToast('success', 'Password updated. You can sign in now.');
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err: unknown) {
      showToast('error', getApiErrorMessage(err, 'Could not reset password. Request a new link.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2>Invalid link</h2>
            <p>This password reset link is missing or invalid.</p>
          </div>
          <p className={styles.switchAuth} style={{ textAlign: 'left' }}>
            <Link to={ROUTES.FORGOT_PASSWORD}>Request a new reset link</Link>
            {' · '}
            <Link to={ROUTES.LOGIN}>Sign in</Link>
          </p>
        </div>
        <div className={styles.artwork}>
          <div className={styles.artworkContent}>
            <h1>
              Secure <span className="text-gradient">Access</span>
            </h1>
            <p>Your wellness journey continues with a fresh password.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>New password</h2>
          <p>Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="New password"
            type="password"
            name="password"
            placeholder="Min 8 characters"
            icon={<HiOutlineLockClosed />}
            passwordToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            type="password"
            name="confirmPassword"
            placeholder="Repeat your password"
            icon={<HiOutlineLockClosed />}
            passwordToggle
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" fullWidth isLoading={loading}>
            Update password
          </Button>
        </form>

        <p className={styles.switchAuth}>
          <Link to={ROUTES.LOGIN}>Back to sign in</Link>
        </p>
      </div>

      <div className={styles.artwork}>
        <div className={styles.artworkContent}>
          <h1>
            Secure <span className="text-gradient">Access</span>
          </h1>
          <p>Your wellness journey continues with a fresh password.</p>
        </div>
      </div>
    </div>
  );
}
