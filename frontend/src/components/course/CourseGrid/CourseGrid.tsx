import type { Course } from '@/types/course.types';
import { CourseCard } from '@/components/course/CourseCard/CourseCard';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './CourseGrid.module.scss';

interface CourseGridProps {
  courses: Course[];
  loading: boolean;
  emptyMessage?: string;
  onCourseClick?: (course: Course) => void;
  /** Home featured: exactly three columns on large screens (no empty fourth slot). */
  variant?: 'default' | 'featured';
}

export function CourseGrid({
  courses,
  loading,
  emptyMessage = 'No courses found.',
  onCourseClick,
  variant = 'default',
}: CourseGridProps) {
  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  if (courses.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={variant === 'featured' ? styles.gridFeatured : styles.grid}>
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onClick={() => onCourseClick?.(course)}
        />
      ))}
    </div>
  );
}
