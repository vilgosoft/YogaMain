import { useState, type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import styles from './Input.module.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  /** Renders a show/hide control (use with type="password" or omit type). */
  passwordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, passwordToggle, type = 'text', ...props }, ref) => {
    const inputId = id || props.name;
    const [showPassword, setShowPassword] = useState(false);
    const effectiveType = passwordToggle ? (showPassword ? 'text' : 'password') : type;
    const toggleLabel = showPassword ? 'Hide password' : 'Show password';

    return (
      <div className={`${styles.field} ${error ? styles['field--error'] : ''} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.wrapper}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={`${styles.input} ${icon ? styles['input--icon'] : ''} ${passwordToggle ? styles['input--toggle'] : ''}`}
            {...props}
          />
          {passwordToggle && (
            <button
              type="button"
              className={styles.toggleVisibility}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={toggleLabel}
            >
              {showPassword ? <HiOutlineEyeSlash aria-hidden /> : <HiOutlineEye aria-hidden />}
            </button>
          )}
        </div>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
