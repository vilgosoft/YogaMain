import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineUser, HiOutlineEnvelope, HiOutlinePhone, HiOutlineLockClosed } from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast/Toast';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { ROUTES } from '@/utils/constants';
import { isValidEmail, isValidPhone, isStrongPassword } from '@/utils/validators';
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
    const errs: Record<string, string> = {};
    if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email) errs.email = 'Email is required';
    else if (!isValidEmail(form.email)) errs.email = 'Invalid email address';
    if (!form.phone) errs.phone = 'Phone number is required';
    else if (!isValidPhone(form.phone)) errs.phone = 'Enter a valid 10-digit Indian phone number';
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
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      showToast('success', 'Account created successfully!');
      navigate(ROUTES.MY_LEARNING);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const axiosErr = err as { response?: { data?: { error?: { message?: string; fields?: Record<string, string> }; message?: string } }; message?: string };
      const errorData = axiosErr?.response?.data?.error;
      if (errorData?.fields) {
        setErrors(errorData.fields);
      }
      const msg =
        errorData?.message ||
        axiosErr?.response?.data?.message ||
        axiosErr?.message ||
        'Registration failed. Please try again.';
      showToast('error', msg);
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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />

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
            label="Phone Number"
            type="tel"
            name="phone"
            placeholder="9876543210"
            icon={<HiOutlinePhone />}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Min 8 characters"
            icon={<HiOutlineLockClosed />}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            placeholder="Repeat your password"
            icon={<HiOutlineLockClosed />}
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
