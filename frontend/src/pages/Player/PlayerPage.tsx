import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ROUTES } from '@/utils/constants';
import {
  HiOutlinePlayCircle,
  HiOutlineLockClosed,
  HiOutlineChevronLeft,
} from 'react-icons/hi2';
import styles from './PlayerPage.module.scss';

interface VideoAccess {
  video_url: string;
  title: string;
}

export function PlayerPage() {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentVideoId = videoId ? parseInt(videoId, 10) : 0;
  const currentCourseId = courseId ? parseInt(courseId, 10) : 0;

  // Load video URL
  useEffect(() => {
    if (!currentVideoId) return;

    setLoading(true);
    setError('');

    client
      .get<ApiResponse<VideoAccess>>(`/videos/${currentVideoId}`)
      .then((res) => {
        const data = res.data.data!;
        setVideoUrl(data.video_url);
        setVideoTitle(data.title);
      })
      .catch((err) => {
        const msg = err.response?.data?.error?.message || 'Failed to load video';
        if (err.response?.status === 403) {
          setError('You must be enrolled in this course to watch this video.');
        } else if (err.response?.status === 401) {
          navigate(ROUTES.LOGIN);
          return;
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [currentVideoId, currentCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}><Spinner /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <HiOutlineLockClosed size={48} />
          <h2>{error}</h2>
          <Link to={ROUTES.COURSES} className={styles.backLink}>
            <HiOutlineChevronLeft size={16} /> Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.playerArea}>
        <div className={styles.videoWrapper}>
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className={styles.video}
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className={styles.noVideo}>
              <HiOutlinePlayCircle size={60} />
              <p>Video not available</p>
            </div>
          )}
        </div>

        <div className={styles.videoInfo}>
          <Link
            to={ROUTES.MY_LEARNING}
            className={styles.backLink}
          >
            <HiOutlineChevronLeft size={16} /> Back to My Learning
          </Link>
          <h1 className={styles.videoTitle}>{videoTitle}</h1>
        </div>
      </div>
    </div>
  );
}
