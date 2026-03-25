import type { Course } from '@/types/course.types';
import { CourseCard } from '@/components/course/CourseCard/CourseCard';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './CourseGrid.module.scss';

interface CourseGridProps {
  courses: Course[];
  loading: boolean;
  emptyMessage?: string;
  onCourseClick?: (course: Course) => void;
}

export function CourseGrid({ courses, loading, emptyMessage = 'No courses found.', onCourseClick }: CourseGridProps) {
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
    <div className={styles.grid}>
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
