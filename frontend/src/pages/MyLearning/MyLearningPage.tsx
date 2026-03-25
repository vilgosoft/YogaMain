import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyLearning, type MyLearningEnrollment } from '@/api/courses.api';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { ROUTES } from '@/utils/constants';
import { formatDuration } from '@/utils/formatters';
import { HiOutlinePlayCircle, HiOutlineFilm, HiOutlineClock } from 'react-icons/hi2';
import styles from './MyLearningPage.module.scss';

export function MyLearningPage() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<MyLearningEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLearning()
      .then(setEnrollments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div className={styles.loading}><Spinner /></div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className={styles.page}>
        <h1 className={styles.title}>My Learning</h1>

        {enrollments.length === 0 ? (
          <div className={styles.empty}>
            <HiOutlinePlayCircle size={48} />
            <h2>No courses yet</h2>
            <p>Start your yoga journey by exploring our course catalog.</p>
            <Button variant="primary" onClick={() => navigate(ROUTES.COURSES)}>
              Browse Courses
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {enrollments.map((enrollment) => (
              <article key={enrollment.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  {enrollment.thumbnail_url ? (
                    <img src={enrollment.thumbnail_url} alt={enrollment.title} className={styles.image} />
                  ) : (
                    <div className={styles.placeholder}>
                      <HiOutlineFilm size={32} />
                    </div>
                  )}
                  <div className={styles.overlay}>
                    <HiOutlinePlayCircle size={40} />
                  </div>
                </div>

                <div className={styles.body}>
                  {enrollment.category_name && (
                    <span className={styles.category}>{enrollment.category_name}</span>
                  )}
                  <h3 className={styles.cardTitle}>{enrollment.title}</h3>

                  <div className={styles.meta}>
                    {enrollment.duration_hours != null && enrollment.duration_hours > 0 && (
                      <span className={styles.metaItem}>
                        <HiOutlineClock size={14} />
                        {formatDuration(enrollment.duration_hours)}
                      </span>
                    )}
                    <span className={styles.metaItem}>
                      <HiOutlineFilm size={14} />
                      {enrollment.completed_videos}/{enrollment.total_videos} lessons
                    </span>
                  </div>

                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${enrollment.progress_pct}%` }}
                      />
                    </div>
                    <span className={styles.progressText}>{enrollment.progress_pct}% complete</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => navigate(`/courses/${enrollment.slug}`)}
                  >
                    {enrollment.progress_pct > 0 ? 'Continue Learning' : 'Start Learning'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
