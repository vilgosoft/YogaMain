import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { Button } from '@/components/ui/Button/Button';
import { useAuth } from '@/hooks/useAuth';
import { expressCourseInterest } from '@/api/courses.api';
import { useToast } from '@/components/ui/Toast/Toast';
import { ROUTES } from '@/utils/constants';
import type { Course } from '@/types/course.types';
import styles from './UpcomingCourseCard.module.scss';

interface UpcomingCourseCardProps {
  course: Course;
}

export function UpcomingCourseCard({ course }: UpcomingCourseCardProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const onInterested = async () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    setLoading(true);
    try {
      const res = await expressCourseInterest(course.id);
      setRegistered(true);
      showToast('success', res.message);
    } catch {
      showToast('error', 'Could not save your interest. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt="" className={styles.image} />
        ) : (
          <div className={styles.placeholder} aria-hidden />
        )}
        <span className={styles.badge}>
          <HiOutlineSparkles size={14} aria-hidden />
          Coming soon
        </span>
        {course.category_name && (
          <span className={styles.category}>{course.category_name}</span>
        )}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{course.title}</h3>
        {course.short_desc && <p className={styles.desc}>{course.short_desc}</p>}
        <Button
          type="button"
          variant="primary"
          size="md"
          fullWidth
          isLoading={loading}
          disabled={registered}
          onClick={() => void onInterested()}
        >
          {registered ? "You're on the list" : "I'm interested"}
        </Button>
      </div>
    </article>
  );
}
