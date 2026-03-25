import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast/Toast';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { ROUTES } from '@/utils/constants';
import { isValidEmail } from '@/utils/validators';
import styles from './AuthPage.module.scss';

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!isValidEmail(form.email)) errs.email = 'Invalid email address';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(form);
      showToast('success', 'Welcome back!');
      navigate(ROUTES.MY_LEARNING);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.error?.message ||
        axiosErr?.response?.data?.message ||
        axiosErr?.message ||
        'Login failed. Please try again.';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Welcome Back</h2>
          <p>Sign in to continue your yoga journey</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="you@example.com"
            icon={<HiOutlineEnvelope />}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Enter your password"
            icon={<HiOutlineLockClosed />}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
          />

          <Button type="submit" variant="primary" fullWidth isLoading={loading}>
            Sign In
          </Button>
        </form>

        <p className={styles.switchAuth}>
          Don&apos;t have an account?{' '}
          <Link to={ROUTES.REGISTER}>Create one</Link>
        </p>
      </div>

      <div className={styles.artwork}>
        <div className={styles.artworkContent}>
          <h1>Begin Your <span className="text-gradient">Yoga Journey</span></h1>
          <p>Access expert-led courses, track your progress, and transform your practice from anywhere.</p>
        </div>
      </div>
    </div>
  );
}
