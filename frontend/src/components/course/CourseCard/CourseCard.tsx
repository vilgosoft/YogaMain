import type { Course } from '@/types/course.types';
import { formatOriginalPrice, formatDuration } from '@/utils/formatters';
import { minPlanPrice } from '@/utils/pricingPlans';
import { HiOutlineClock, HiOutlineFilm } from 'react-icons/hi2';
import styles from './CourseCard.module.scss';

interface CourseCardProps {
  course: Course;
  onClick?: () => void;
}

const difficultyColors: Record<string, string> = {
  beginner: styles.badgeBeginner,
  intermediate: styles.badgeIntermediate,
  advanced: styles.badgeAdvanced,
};

export function CourseCard({ course, onClick }: CourseCardProps) {
  const fromPriceLabel = `From ${formatOriginalPrice(minPlanPrice())}`;

  return (
    <article className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.imageWrap}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <HiOutlineFilm size={40} />
          </div>
        )}
        {course.category_name && (
          <span className={styles.category}>{course.category_name}</span>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{course.title}</h3>
        {course.short_desc && (
          <p className={styles.desc}>{course.short_desc}</p>
        )}

        <div className={styles.meta}>
          <span className={`${styles.badge} ${difficultyColors[course.difficulty] || ''}`}>
            {course.difficulty}
          </span>
          {course.duration_hours != null && course.duration_hours > 0 && (
            <span className={styles.metaItem}>
              <HiOutlineClock size={14} />
              {formatDuration(course.duration_hours)}
            </span>
          )}
          {course.video_count != null && course.video_count > 0 && (
            <span className={styles.metaItem}>
              <HiOutlineFilm size={14} />
              {course.video_count} videos
            </span>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.price}>
            {course.is_free ? (
              <span className={styles.free}>Free</span>
            ) : (
              <div className={styles.paidPlans}>
                <span className={styles.current}>{fromPriceLabel}</span>
                <span className={styles.planNote}>3-month &amp; 1-year options</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
