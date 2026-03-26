import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseBySlug, type CourseDetailResponse } from '@/api/courses.api';
import { initiatePayment } from '@/api/payments.api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast/Toast';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { formatOriginalPrice, formatDuration, formatVideoTime } from '@/utils/formatters';
import {
  DEFAULT_PLAN_CODE,
  groupedPricingPlans,
  getPlanByCode,
  type PlanCode,
} from '@/utils/pricingPlans';
import { ROUTES } from '@/utils/constants';
import { getApiErrorMessage } from '@/utils/apiErrors';
import {
  HiOutlineClock,
  HiOutlineFilm,
  HiOutlinePlayCircle,
  HiOutlineLockClosed,
  HiOutlineSignal,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import styles from './CourseDetailPage.module.scss';

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanCode>(DEFAULT_PLAN_CODE);

  useEffect(() => {
    setSelectedPlanCode(DEFAULT_PLAN_CODE);
  }, [slug]);

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
  }, [slug, isAuthenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuy = async () => {
    if (!data) return;

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    setPurchasing(true);
    try {
      const result = await initiatePayment(
        data.course.id,
        data.course.is_free ? undefined : selectedPlanCode
      );

      if (data.course.is_free) {
        showToast('success', 'Successfully enrolled!');
        navigate(ROUTES.MY_LEARNING);
      } else {
        window.location.href = result.redirect_url;
      }
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      if (errorCode === 'ALREADY_ENROLLED') {
        // Update local state so UI reflects enrolled status
        setData((prev) => prev ? { ...prev, is_enrolled: true } : prev);
        showToast('success', 'You are already enrolled! Start watching.');
      } else {
        showToast('error', getApiErrorMessage(err, 'Failed to initiate payment. Please try again.'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleVideoClick = (videoId: number, isPreview: boolean) => {
    if (!data) return;

    if (data.is_enrolled || isPreview) {
      navigate(`/player/${data.course.id}/${videoId}`);
    } else if (!isAuthenticated) {
      showToast('info', 'Please login and enroll to watch this video');
    } else {
      showToast('info', 'Please enroll in this course to watch videos');
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
  const selectedPlan = getPlanByCode(selectedPlanCode);
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
                {videos.map((video, idx) => {
                  const canPlay = is_enrolled || video.is_preview;
                  return (
                    <li
                      key={video.id}
                      className={`${styles.lesson} ${canPlay ? styles.lessonClickable : ''}`}
                      onClick={() => handleVideoClick(video.id, !!video.is_preview)}
                    >
                      <span className={styles.lessonNum}>{idx + 1}</span>
                      <div className={styles.lessonInfo}>
                        <span className={styles.lessonTitle}>{video.title}</span>
                        {video.duration_sec != null && (
                          <span className={styles.lessonDuration}>{formatVideoTime(video.duration_sec)}</span>
                        )}
                      </div>
                      {canPlay ? (
                        <HiOutlinePlayCircle size={18} className={styles.previewIcon} />
                      ) : (
                        <HiOutlineLockClosed size={16} className={styles.lockIcon} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.priceCard}>
            {is_enrolled ? (
              /* ---- ENROLLED STATE ---- */
              <>
                <div className={styles.enrolledBanner}>
                  <HiOutlineCheckCircle size={24} />
                  <span>You are enrolled</span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    const firstVideo = videos[0];
                    if (firstVideo) {
                      navigate(`/player/${course.id}/${firstVideo.id}`);
                    } else {
                      navigate(ROUTES.MY_LEARNING);
                    }
                  }}
                >
                  <HiOutlinePlayCircle size={20} />
                  {videos.length > 0 ? 'Start Watching' : 'Go to My Learning'}
                </Button>

                <ul className={styles.features}>
                  <li>{videos.length} video lessons</li>
                  {course.duration_hours != null && course.duration_hours > 0 && (
                    <li>{formatDuration(course.duration_hours)} of content</li>
                  )}
                  <li>Full access to all videos</li>
                  <li>Mobile friendly</li>
                </ul>
              </>
            ) : (
              /* ---- NOT ENROLLED STATE ---- */
              <>
                {course.is_free ? (
                  <div className={styles.priceSection}>
                    <span className={styles.priceFree}>Free</span>
                  </div>
                ) : (
                  <>
                    <fieldset className={styles.planFieldset}>
                      <legend className={styles.planLegend}>Plan Options &amp; Accessibility</legend>
                      <p className={styles.planIntro}>
                        Choose a duration and whether you want diet guidance included. The same options apply to every course.
                      </p>
                      {groupedPricingPlans().map((group) => (
                        <div key={group.title} className={styles.planGroup}>
                          <div className={styles.planGroupTitle}>{group.title}</div>
                          <div className={styles.planOptions}>
                            {group.plans.map((plan) => {
                              const active = selectedPlanCode === plan.code;
                              return (
                                <label
                                  key={plan.code}
                                  className={`${styles.planOption} ${active ? styles.planOptionActive : ''}`}
                                >
                                  <input
                                    type="radio"
                                    name="pricing-plan"
                                    value={plan.code}
                                    checked={active}
                                    onChange={() => setSelectedPlanCode(plan.code)}
                                  />
                                  <span className={styles.planOptionBody}>
                                    <span className={styles.planOptionLabel}>{plan.option}</span>
                                    <span className={styles.planOptionPrice}>
                                      {formatOriginalPrice(plan.amount)}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </fieldset>
                    <div className={styles.priceSection}>
                      <span className={styles.selectedPlanSummary}>Selected</span>
                      <span className={styles.priceCurrent}>{formatOriginalPrice(selectedPlan.amount)}</span>
                    </div>
                  </>
                )}

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
                      : `Pay ${formatOriginalPrice(selectedPlan.amount)}`
                  }
                </Button>

                <ul className={styles.features}>
                  <li>{videos.length} video lessons</li>
                  {course.duration_hours != null && course.duration_hours > 0 && (
                    <li>{formatDuration(course.duration_hours)} of content</li>
                  )}
                  {!course.is_free && <li>Access for your selected plan period</li>}
                  {course.is_free && <li>Full access while enrolled</li>}
                  <li>Mobile friendly</li>
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </PageWrapper>
  );
}
