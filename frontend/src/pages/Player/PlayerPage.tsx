import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ROUTES } from '@/utils/constants';
import {
  HiOutlinePlayCircle,
  HiOutlineLockClosed,
  HiOutlineChevronLeft,
  HiOutlineExclamationTriangle,
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
  const [videoError, setVideoError] = useState('');

  const currentVideoId = videoId ? parseInt(videoId, 10) : 0;
  const currentCourseId = courseId ? parseInt(courseId, 10) : 0;

  // Normalize a video URL to be absolute
  const normalizeUrl = useCallback((url: string): string => {
    if (!url) return '';
    // Already absolute
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Relative path — make absolute using current origin
    if (url.startsWith('/')) return window.location.origin + url;
    // Relative without leading slash
    return window.location.origin + '/' + url;
  }, []);

  // Load video URL
  useEffect(() => {
    if (!currentVideoId) return;

    setLoading(true);
    setError('');
    setVideoError('');

    client
      .get<ApiResponse<VideoAccess>>(`/videos/${currentVideoId}`)
      .then((res) => {
        const data = res.data.data!;
        const url = normalizeUrl(data.video_url);
        setVideoUrl(url);
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
  }, [currentVideoId, currentCourseId, normalizeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle video element errors
  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const err = video.error;
    let msg = 'Unable to play this video.';
    if (err) {
      switch (err.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          msg = 'Video playback was aborted.';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          msg = 'A network error prevented the video from loading.';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          msg = 'The video format is not supported by your browser. Try using Chrome or Firefox.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          msg = 'The video file could not be loaded. The file may be missing or in an unsupported format.';
          break;
      }
    }
    setVideoError(msg);
  }, []);

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
          {videoUrl && !videoError ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className={styles.video}
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              onError={handleVideoError}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className={styles.noVideo}>
              {videoError ? (
                <>
                  <HiOutlineExclamationTriangle size={48} />
                  <p>{videoError}</p>
                  <button
                    className={styles.retryBtn}
                    onClick={() => {
                      setVideoError('');
                      // Force re-render by briefly clearing and re-setting URL
                      const url = videoUrl;
                      setVideoUrl(null);
                      setTimeout(() => setVideoUrl(url), 100);
                    }}
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <HiOutlinePlayCircle size={60} />
                  <p>Video not available</p>
                </>
              )}
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
