import type { ReactNode } from 'react';
import styles from './PageWrapper.module.scss';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return <main className={`${styles.wrapper} ${className}`}>{children}</main>;
}
