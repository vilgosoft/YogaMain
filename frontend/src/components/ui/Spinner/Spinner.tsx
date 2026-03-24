import styles from './Spinner.module.scss';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`${styles.spinner} ${styles[`spinner--${size}`]} ${className}`}>
      <div className={styles.ring} />
    </div>
  );
}
