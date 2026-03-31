import type { ReactNode } from 'react';
import styles from './PageWrapper.module.scss';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  /** Wider horizontal area (e.g. course player) without changing inner grid structure */
  variant?: 'default' | 'fluid';
}

export function PageWrapper({ children, className = '', variant = 'default' }: PageWrapperProps) {
  const fluid = variant === 'fluid' ? styles.wrapperFluid : '';
  return <main className={`${styles.wrapper} ${fluid} ${className}`.trim()}>{children}</main>;
}
