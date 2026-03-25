import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseBySlug, type CourseDetailResponse } from '@/api/courses.api';
import { initiatePayment } from '@/api/payments.api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast/Toast';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { formatPrice, formatOriginalPrice, formatDuration, formatVideoTime } from '@/utils/formatters';
import { ROUTES } from '@/utils/constants';
import {
  HiOutlineClock,
  HiOutlineFilm,
  HiOutlinePlayCircle,
  HiOutlineLockClosed,
  HiOutlineAcademicCap,
  HiOutlineSignal,
} from 'react-icons/hi2';
import styles from './CourseDetailPage.module.scss';

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getCourseBySlug(slug)
      .then(setData)
      .catch(() => {
        showToast('error', 'Course not found');
        navigate(ROUTES.COURSES);
      })
      .finally(() => setLoading(false));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuy = async () => {
    if (!data) return;

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    setPurchasing(true);
    try {
      const result = await initiatePayment(data.course.id);

      if (data.course.is_free) {
        // Free courses are auto-enrolled on the backend
        showToast('success', 'Successfully enrolled!');
        navigate(ROUTES.MY_LEARNING);
      } else {
        // Redirect to PhonePe payment page
        window.location.href = result.redirect_url;
      }
    } catch {
      showToast('error', 'Failed to initiate payment. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className={styles.loading}><Spinner /></div>
      </PageWrapper>
    );
  }

  if (!data) return null;

  const { course, videos, is_enrolled } = data;
  const hasDiscount = course.discount_price != null && course.discount_price > 0 && course.discount_price < course.price;
  const totalDuration = videos.reduce((sum, v) => sum + (v.duration_sec || 0), 0);

  return (
    <PageWrapper>
      <div className={styles.page}>
        <div className={styles.main}>
          {/* Hero image */}
          <div className={styles.hero}>
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className={styles.heroImg} />
            ) : (
              <div className={styles.heroPlaceholder}>
                <HiOutlineFilm size={60} />
              </div>
            )}
          </div>

          {/* Course info */}
          <div className={styles.info}>
            {course.category_name && (
              <span className={styles.categoryBadge}>{course.category_name}</span>
            )}
            <h1 className={styles.title}>{course.title}</h1>

            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <HiOutlineSignal size={16} />
                <span className={styles.capitalize}>{course.difficulty}</span>
              </span>
              {course.duration_hours != null && course.duration_hours > 0 && (
                <span className={styles.metaItem}>
                  <HiOutlineClock size={16} />
                  {formatDuration(course.duration_hours)}
                </span>
              )}
              <span className={styles.metaItem}>
                <HiOutlineFilm size={16} />
                {videos.length} videos
              </span>
            </div>

            {course.description && (
              <div className={styles.description}>
                <h2>About This Course</h2>
                <p>{course.description}</p>
              </div>
            )}

            {/* Video list */}
            <div className={styles.videoList}>
              <h2>Course Content</h2>
              <p className={styles.videoSummary}>
                {videos.length} lessons &middot; {formatVideoTime(totalDuration)} total
              </p>
              <ul className={styles.lessons}>
                {videos.map((video, idx) => (
                  <li key={video.id} className={styles.lesson}>
                    <span className={styles.lessonNum}>{idx + 1}</span>
                    <div className={styles.lessonInfo}>
                      <span className={styles.lessonTitle}>{video.title}</span>
                      {video.duration_sec != null && (
                        <span className={styles.lessonDuration}>{formatVideoTime(video.duration_sec)}</span>
                      )}
                    </div>
                    {video.is_preview ? (
                      <HiOutlinePlayCircle size={18} className={styles.previewIcon} />
                    ) : (
                      <HiOutlineLockClosed size={16} className={styles.lockIcon} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.priceCard}>
            <div className={styles.priceSection}>
              {course.is_free ? (
                <span className={styles.priceFree}>Free</span>
              ) : (
                <>
                  <span className={styles.priceCurrent}>
                    {formatPrice(course.price, course.discount_price)}
                  </span>
                  {hasDiscount && (
                    <span className={styles.priceOriginal}>
                      {formatOriginalPrice(course.price)}
                    </span>
                  )}
                </>
              )}
            </div>

            {is_enrolled ? (
              <Button variant="primary" size="lg" fullWidth onClick={() => navigate(ROUTES.MY_LEARNING)}>
                <HiOutlineAcademicCap size={20} />
                Continue Learning
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleBuy}
                isLoading={purchasing}
              >
                {!isAuthenticated
                  ? 'Login to Enroll'
                  : course.is_free
                    ? 'Enroll for Free'
                    : `Buy Now ${formatPrice(course.price, course.discount_price)}`
                }
              </Button>
            )}

            <ul className={styles.features}>
              <li>{videos.length} video lessons</li>
              {course.duration_hours != null && course.duration_hours > 0 && (
                <li>{formatDuration(course.duration_hours)} of content</li>
              )}
              <li>Lifetime access</li>
              <li>Mobile friendly</li>
            </ul>
          </div>
        </aside>
      </div>
    </PageWrapper>
  );
}
