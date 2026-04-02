import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getCourseBySlug, type CourseDetailResponse } from '@/api/courses.api';
import { initiatePayment, verifyPayment } from '@/api/payments.api';
import { loadRazorpayScript, openRazorpayCheckout } from '@/utils/razorpayCheckout';
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
import { ROUTES, SITE_LEGAL } from '@/utils/constants';
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

const PENDING_ENROLL_KEY = (slug: string) => `yogaPendingEnroll:${slug}`;

function isPlanCode(value: unknown): value is PlanCode {
  return value === '1y_no_diet' || value === '1y_diet';
}

/** MySQL/JSON may send 0/1 or "0"/"1"; only explicit free flags skip paid checkout. */
function isCatalogCourseFree(isFree: unknown): boolean {
  if (isFree === true || isFree === 1) return true;
  if (isFree === '1') return true;
  return false;
}

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanCode>(DEFAULT_PLAN_CODE);
  /** Blocks double-clicks before React re-renders with isLoading/disabled. */
  const buyInFlightRef = useRef(false);

  useEffect(() => {
    setSelectedPlanCode(DEFAULT_PLAN_CODE);
  }, [slug]);

  /** Restore plan chosen before “Login to Enroll” (session survives auth redirect). */
  useEffect(() => {
    if (!slug) return;
    const raw = sessionStorage.getItem(PENDING_ENROLL_KEY(slug));
    if (!raw) return;
    try {
      const planCode = JSON.parse(raw)?.planCode;
      if (isPlanCode(planCode)) {
        setSelectedPlanCode(planCode);
      }
    } catch {
      /* ignore */
    }
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
    if (!data || !slug) return;

    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(
          PENDING_ENROLL_KEY(slug),
          JSON.stringify({ planCode: selectedPlanCode })
        );
      } catch {
        /* ignore quota / private mode */
      }
      const returnPath =
        location.pathname + (location.search && location.search.length > 0 ? location.search : '');
      navigate(ROUTES.LOGIN, { state: { from: { pathname: returnPath } } });
      return;
    }

    if (buyInFlightRef.current) return;
    buyInFlightRef.current = true;
    setPurchasing(true);
    let checkoutModalOpened = false;
    try {
      const catalogFree = isCatalogCourseFree(data.course.is_free);
      const result = await initiatePayment(
        data.course.id,
        catalogFree ? undefined : selectedPlanCode
      );

      if (catalogFree || result.status === 'enrolled') {
        try {
          sessionStorage.removeItem(PENDING_ENROLL_KEY(slug));
        } catch {
          /* ignore */
        }
        showToast('success', 'Successfully enrolled!');
        setData((prev) => (prev ? { ...prev, is_enrolled: true } : prev));
        navigate(ROUTES.MY_LEARNING);
      } else if (
        result.razorpay_key_id &&
        result.razorpay_order_id &&
        result.merchant_txn_id != null &&
        result.amount != null
      ) {
        try {
          sessionStorage.removeItem(PENDING_ENROLL_KEY(slug));
        } catch {
          /* ignore */
        }
        await loadRazorpayScript();
        checkoutModalOpened = true;
        openRazorpayCheckout({
          key: result.razorpay_key_id,
          orderId: result.razorpay_order_id,
          amount: result.amount,
          currency: result.currency ?? 'INR',
          businessName: SITE_LEGAL.name,
          description: result.course_title ?? data.course.title,
          prefill: {
            email: result.prefill_email || user?.email,
            name: result.prefill_name || user?.name,
          },
          handler: async (rzpResponse) => {
            try {
              await verifyPayment({
                merchant_txn_id: result.merchant_txn_id!,
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_signature: rzpResponse.razorpay_signature,
              });
              showToast('success', 'Payment successful! You are enrolled.');
              setData((prev) => (prev ? { ...prev, is_enrolled: true } : prev));
              navigate(ROUTES.MY_LEARNING);
            } catch (verifyErr) {
              showToast(
                'error',
                getApiErrorMessage(verifyErr, 'Payment received but verification failed. Contact support if charged.')
              );
            } finally {
              buyInFlightRef.current = false;
              setPurchasing(false);
            }
          },
          onDismiss: () => {
            buyInFlightRef.current = false;
            setPurchasing(false);
          },
        });
      } else {
        showToast('error', 'Could not start payment. Please try again.');
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
      if (!checkoutModalOpened) {
        buyInFlightRef.current = false;
        setPurchasing(false);
      }
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
  const courseIsFree = isCatalogCourseFree(course.is_free);
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
            {is_enrolled && (
              <div className={styles.heroEnrolledBadge}>
                <HiOutlineCheckCircle size={20} aria-hidden />
                Enrolled
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
                {courseIsFree ? (
                  <div className={styles.priceSection}>
                    <span className={styles.priceFree}>Free</span>
                  </div>
                ) : (
                  <>
                    <fieldset className={styles.planFieldset}>
                      <legend className={styles.planLegend}>Plan Options &amp; Accessibility</legend>
                      <p className={styles.planIntro}>
                        One-year access. Choose whether you want diet guidance included. The same options apply to every course.
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
                  onDoubleClick={(e) => e.preventDefault()}
                  isLoading={purchasing}
                >
                  {!isAuthenticated
                    ? 'Login to Enroll'
                    : courseIsFree
                      ? 'Enroll for Free'
                      : `Pay ${formatOriginalPrice(selectedPlan.amount)}`
                  }
                </Button>

                <ul className={styles.features}>
                  <li>{videos.length} video lessons</li>
                  {course.duration_hours != null && course.duration_hours > 0 && (
                    <li>{formatDuration(course.duration_hours)} of content</li>
                  )}
                  {!courseIsFree && <li>Access for your selected plan period</li>}
                  {courseIsFree && <li>Full access while enrolled</li>}
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
