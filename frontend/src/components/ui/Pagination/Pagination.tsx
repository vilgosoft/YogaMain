import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import type { PaginationMeta } from '@/types/api.types';
import styles from './Pagination.module.scss';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.last_page <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, meta.page - 2);
  const end = Math.min(meta.last_page, meta.page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className={styles.pagination}>
      <span className={styles.info}>
        Showing {(meta.page - 1) * meta.per_page + 1}–
        {Math.min(meta.page * meta.per_page, meta.total)} of {meta.total}
      </span>

      <div className={styles.buttons}>
        <button
          className={styles.btn}
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <HiChevronLeft />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            className={`${styles.btn} ${p === meta.page ? styles.active : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          className={styles.btn}
          disabled={meta.page >= meta.last_page}
          onClick={() => onPageChange(meta.page + 1)}
        >
          <HiChevronRight />
        </button>
      </div>
    </div>
  );
}
