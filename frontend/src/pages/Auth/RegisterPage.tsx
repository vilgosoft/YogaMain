import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineUser, HiOutlineEnvelope, HiOutlinePhone, HiOutlineLockClosed } from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast/ToastContext';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { ROUTES } from '@/utils/constants';
import { isValidEmail, isValidPhone, isStrongPassword } from '@/utils/validators';
import { getApiErrorDetails } from '@/utils/apiErrors';
import styles from './AuthPage.module.scss';

export function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const errs: Record<string, string> = {};
    if (!name || name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!email) errs.email = 'Email is required';
    else if (!isValidEmail(email)) errs.email = 'Invalid email address';
    if (!phone) errs.phone = 'Phone number is required';
    else if (!isValidPhone(phone)) errs.phone = 'Enter a valid 10-digit Indian phone number';
    if (!form.password) errs.password = 'Password is required';
    else {
      const pwErr = isStrongPassword(form.password);
      if (pwErr) errs.password = pwErr;
    }
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      showToast('success', 'Account created successfully!');
      navigate(ROUTES.MY_LEARNING);
    } catch (err: unknown) {
      const { message, fields } = getApiErrorDetails(err);
      if (fields) {
        setErrors((prev) => ({ ...prev, ...fields }));
      }
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Create Account</h2>
          <p>Start your yoga practice today</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Full Name"
            type="text"
            name="name"
            placeholder="Your full name"
            icon={<HiOutlineUser />}
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm({ ...form, name });
              setErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={errors.name}
          />

          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="you@example.com"
            icon={<HiOutlineEnvelope />}
            value={form.email}
            onChange={(e) => {
              const email = e.target.value;
              setForm({ ...form, email });
              setErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={errors.email}
          />

          <Input
            label="Phone Number"
            type="tel"
            name="phone"
            placeholder="9876543210"
            icon={<HiOutlinePhone />}
            value={form.phone}
            onChange={(e) => {
              const phone = e.target.value.replace(/\D/g, '').slice(0, 10);
              setForm({ ...form, phone });
              setErrors((prev) => ({ ...prev, phone: '' }));
            }}
            error={errors.phone}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Min 8 characters"
            icon={<HiOutlineLockClosed />}
            value={form.password}
            onChange={(e) => {
              const password = e.target.value;
              setForm({ ...form, password });
              setErrors((prev) => ({ ...prev, password: '' }));
            }}
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            placeholder="Repeat your password"
            icon={<HiOutlineLockClosed />}
            value={form.confirmPassword}
            onChange={(e) => {
              const confirmPassword = e.target.value;
              setForm({ ...form, confirmPassword });
              setErrors((prev) => ({ ...prev, confirmPassword: '' }));
            }}
            error={errors.confirmPassword}
          />

          <Button type="submit" variant="primary" fullWidth isLoading={loading}>
            Create Account
          </Button>
        </form>

        <p className={styles.switchAuth}>
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN}>Sign in</Link>
        </p>
      </div>

      <div className={styles.artwork}>
        <div className={styles.artworkContent}>
          <h1>Transform Your <span className="text-gradient">Practice</span></h1>
          <p>Join thousands of students learning yoga with expert guidance and structured courses.</p>
        </div>
      </div>
    </div>
  );
}
