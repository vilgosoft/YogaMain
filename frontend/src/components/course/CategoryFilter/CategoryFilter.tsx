import type { Category } from '@/types/course.types';
import styles from './CategoryFilter.module.scss';

interface CategoryFilterProps {
  categories: Category[];
  activeId: number | null;
  onChange: (id: number | null) => void;
}

export function CategoryFilter({ categories, activeId, onChange }: CategoryFilterProps) {
  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.pill} ${activeId === null ? styles.active : ''}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`${styles.pill} ${activeId === cat.id ? styles.active : ''}`}
          onClick={() => onChange(cat.id)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
