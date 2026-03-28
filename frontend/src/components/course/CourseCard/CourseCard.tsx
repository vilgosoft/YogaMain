import type { Course } from '@/types/course.types';
import { formatOriginalPrice, formatDuration } from '@/utils/formatters';
import { minPlanPrice } from '@/utils/pricingPlans';
import { ROUTES } from '@/utils/constants';
import { useNavigate } from 'react-router-dom';
import { HiOutlineClock, HiOutlineFilm, HiOutlineCheckCircle } from 'react-icons/hi2';
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
  const navigate = useNavigate();
  const fromPriceLabel = `From ${formatOriginalPrice(minPlanPrice())}`;
  const enrolled = course.is_enrolled === true;

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
        {enrolled && (
          <span className={styles.enrolledBadge}>
            <HiOutlineCheckCircle size={14} aria-hidden />
            Enrolled
          </span>
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
          {enrolled ? (
            <div className={styles.enrolledFooter}>
              <p className={styles.enrolledNote}>You already have this course.</p>
              <button
                type="button"
                className={styles.dashboardLink}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(ROUTES.MY_LEARNING);
                }}
              >
                View in My Learning
              </button>
            </div>
          ) : (
            <div className={styles.price}>
              {course.is_free ? (
                <span className={styles.free}>Free</span>
              ) : (
                <div className={styles.paidPlans}>
                  <span className={styles.current}>{fromPriceLabel}</span>
                  <span className={styles.planNote}>1-year plans</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
