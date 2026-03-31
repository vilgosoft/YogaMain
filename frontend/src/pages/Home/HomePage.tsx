import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineAcademicCap, HiOutlineUsers, HiOutlinePlayCircle, HiOutlineClock } from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button/Button';
import { CourseGrid } from '@/components/course/CourseGrid/CourseGrid';
import { UpcomingCourseCard } from '@/components/course/UpcomingCourseCard/UpcomingCourseCard';
import {
  getFeaturedCourses,
  getLandingStats,
  getUpcomingCourses,
  type LandingStats,
} from '@/api/courses.api';
import type { Course } from '@/types/course.types';
import { ROUTES } from '@/utils/constants';
import styles from './HomePage.module.scss';

const statDefs: Array<{
  key: keyof LandingStats;
  icon: ReactNode;
  label: string;
}> = [
  { key: 'total_users', icon: <HiOutlineUsers />, label: 'Total Users' },
  { key: 'total_courses', icon: <HiOutlineAcademicCap />, label: 'Yoga Courses' },
  { key: 'total_videos', icon: <HiOutlinePlayCircle />, label: 'Video Lessons' },
  { key: 'total_content_hours', icon: <HiOutlineClock />, label: 'Hours of Content' },
];

const features = [
  {
    title: 'Expert-Led Courses',
    description: 'Learn from certified yoga instructors with years of teaching experience.',
  },
  {
    title: 'Learn at Your Pace',
    description: 'Access courses anytime, anywhere. Pause, rewind, and practice at your own speed.',
  },
  {
    title: 'Structured Learning',
    description: 'Follow a clear path from beginner to advanced with organized course categories.',
  },
  {
    title: 'Affordable Pricing',
    description: 'High-quality yoga education at prices that make wellness accessible to everyone.',
  },
  {
    title: 'Track Your Progress',
    description: 'Monitor your learning journey with detailed progress tracking and milestones.',
  },
  {
    title: 'Secure Streaming',
    description: 'Watch HD videos with our secure, buffer-free streaming technology.',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [upcomingCourses, setUpcomingCourses] = useState<Course[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [landingStats, setLandingStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    getFeaturedCourses()
      .then(setFeaturedCourses)
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    getUpcomingCourses()
      .then(setUpcomingCourses)
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    getLandingStats()
      .then(setLandingStats)
      .catch(() => {});
  }, []);

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Your Wellness Journey Starts Here</span>
          <h1>
            Master the art of{' '}
            <span className={styles.heroGradient}>Yoga & Meditation.</span>
          </h1>
          <p className={styles.heroSub}>
            Build real skills, find inner peace, and transform your body and mind with expert-led courses designed for every level.
          </p>
          <div className={styles.heroCta}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(isAuthenticated ? ROUTES.MY_LEARNING : ROUTES.REGISTER)}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate(ROUTES.COURSES)}>
              Browse Courses
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          {statDefs.map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <span className={styles.statIcon}>{stat.icon}</span>
              <div>
                <span className={styles.statValue}>
                  {landingStats != null
                    ? landingStats[stat.key].toLocaleString('en-IN')
                    : '—'}
                </span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features / Why Us */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <h2>
            Why Choose <span className={styles.heroGradient}>Sai ishani Yogashala</span>
          </h2>
          <p>Everything you need to build a sustainable yoga practice.</p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming courses */}
      {(upcomingLoading || upcomingCourses.length > 0) && (
        <section className={styles.upcoming} aria-labelledby="upcoming-heading">
          <div className={styles.upcomingHeader}>
            <h2 id="upcoming-heading">
              Upcoming <span className={styles.heroGradient}>Courses</span>
            </h2>
            <p>Be the first to know when these programs go live. Tap I&apos;m interested and we&apos;ll notify our team.</p>
          </div>
          {upcomingLoading ? (
            <p className={styles.upcomingLoading}>Loading…</p>
          ) : (
            <div className={styles.upcomingGrid}>
              {upcomingCourses.map((c) => (
                <UpcomingCourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured Courses */}
      <section className={styles.featured}>
        <div className={styles.featuredHeader}>
          <h2>
            Featured <span className={styles.heroGradient}>Courses</span>
          </h2>
          <p>Start with our most popular yoga courses.</p>
        </div>
        <CourseGrid
          courses={featuredCourses.slice(0, 3)}
          loading={featuredLoading}
          emptyMessage="Courses coming soon!"
          variant="featured"
          onCourseClick={(course) => navigate(`/courses/${course.slug}`)}
        />
        {featuredCourses.length > 0 && (
          <div className={styles.viewAll}>
            <Button variant="outline" size="lg" onClick={() => navigate(ROUTES.COURSES)}>
              View All Courses
            </Button>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2>
            Ready to start your{' '}
            <span className={styles.heroGradient}>Yoga Journey?</span>
          </h2>
          <p>Join our community of learners and begin transforming your practice today.</p>
          <div className={styles.ctaButtons}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(isAuthenticated ? ROUTES.MY_LEARNING : ROUTES.REGISTER)}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Sign Up Now'}
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate(ROUTES.COURSES)}>
              View Courses
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
