import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import {
  getPlayerCurriculum,
  postVideoProgress,
  type PlayerCurriculumResponse,
  type PlayerLesson,
} from '@/api/courses.api';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { ROUTES } from '@/utils/constants';
import { formatVideoTime, formatTotalDurationSeconds } from '@/utils/formatters';
import {
  HiOutlinePlayCircle,
  HiOutlineLockClosed,
  HiOutlineChevronLeft,
  HiOutlineExclamationTriangle,
  HiOutlineChevronRight,
  HiOutlineBars3,
  HiOutlineXMark,
} from 'react-icons/hi2';
import styles from './PlayerPage.module.scss';

interface VideoAccess {
  video_url: string;
  title: string;
  player_kind?: 'html5' | 'drive_iframe';
}

export function PlayerPage() {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [curriculum, setCurriculum] = useState<PlayerCurriculumResponse | null>(null);
  const [curriculumError, setCurriculumError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playerKind, setPlayerKind] = useState<'html5' | 'drive_iframe'>('html5');
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [videoError, setVideoError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentVideoId = videoId ? parseInt(videoId, 10) : 0;
  const currentCourseId = courseId ? parseInt(courseId, 10) : 0;

  const normalizeUrl = useCallback((url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return window.location.origin + url;
    return `${window.location.origin}/${url}`;
  }, []);

  // Load curriculum (lessons + progress)
  useEffect(() => {
    if (!currentCourseId) return;
    setLoadingCurriculum(true);
    setCurriculumError('');
    getPlayerCurriculum(currentCourseId)
      .then(setCurriculum)
      .catch((err) => {
        const status = err.response?.status;
        if (status === 403) {
          setCurriculumError('You are not enrolled in this course.');
        } else if (status === 401) {
          navigate(ROUTES.LOGIN);
        } else {
          setCurriculumError(err.response?.data?.error?.message || 'Failed to load course');
        }
      })
      .finally(() => setLoadingCurriculum(false));
  }, [currentCourseId, navigate]);

  // Load stream URL when lesson changes
  useEffect(() => {
    if (!currentVideoId) return;

    setLoadingVideo(true);
    setVideoError('');
    setVideoUrl(null);
    setPlayerKind('html5');

    client
      .get<ApiResponse<VideoAccess>>(`/videos/${currentVideoId}`)
      .then((res) => {
        const data = res.data.data!;
        setPlayerKind(data.player_kind === 'drive_iframe' ? 'drive_iframe' : 'html5');
        setVideoUrl(normalizeUrl(data.video_url));
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setVideoError('You must be enrolled to watch this lesson.');
        } else if (err.response?.status === 401) {
          navigate(ROUTES.LOGIN);
        } else {
          setVideoError(err.response?.data?.error?.message || 'Failed to load video');
        }
      })
      .finally(() => setLoadingVideo(false));
  }, [currentVideoId, normalizeUrl, navigate]);

  const flushProgress = useCallback(
    async (markComplete: boolean) => {
      const el = videoRef.current;
      if (!el || !currentVideoId) return;
      const sec = Math.floor(el.currentTime);
      try {
        const { course_progress_pct } = await postVideoProgress(currentVideoId, {
          watched_sec: sec,
          mark_complete: markComplete,
        });
        setCurriculum((prev) => {
          if (!prev) return prev;
          const dur =
            prev.lessons.find((l) => l.id === currentVideoId)?.duration_sec ?? 0;
          const lessons: PlayerLesson[] = prev.lessons.map((lesson) => {
            if (lesson.id !== currentVideoId) return lesson;
            const completed = markComplete || lesson.is_completed;
            let pct = lesson.lesson_progress_pct;
            if (completed) pct = 100;
            else if (dur > 0) pct = Math.min(100, Math.round((sec / dur) * 100));
            return {
              ...lesson,
              watched_sec: sec,
              is_completed: completed,
              lesson_progress_pct: pct,
            };
          });
          const completedLessons = lessons.filter((l) => l.is_completed).length;
          return {
            ...prev,
            lessons,
            completed_lessons: completedLessons,
            course_progress_pct,
          };
        });
      } catch {
        /* non-blocking */
      }
    },
    [currentVideoId]
  );

  const markDriveLessonComplete = useCallback(async () => {
    if (!currentVideoId) return;
    try {
      const { course_progress_pct } = await postVideoProgress(currentVideoId, {
        watched_sec: 0,
        mark_complete: true,
      });
      setCurriculum((prev) => {
        if (!prev) return prev;
        const dur = prev.lessons.find((l) => l.id === currentVideoId)?.duration_sec ?? 0;
        const lessons: PlayerLesson[] = prev.lessons.map((lesson) => {
          if (lesson.id !== currentVideoId) return lesson;
          return {
            ...lesson,
            watched_sec: dur > 0 ? dur : lesson.watched_sec,
            is_completed: true,
            lesson_progress_pct: 100,
          };
        });
        const completedLessons = lessons.filter((l) => l.is_completed).length;
        return {
          ...prev,
          lessons,
          completed_lessons: completedLessons,
          course_progress_pct,
        };
      });
    } catch {
      /* non-blocking */
    }
  }, [currentVideoId]);

  const scheduleDebouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushProgress(false);
    }, 4000);
  }, [flushProgress]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

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
          msg = 'The video format is not supported by your browser.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          msg = 'The video file could not be loaded.';
          break;
      }
    }
    setVideoError(msg);
  }, []);

  const currentLesson = curriculum?.lessons.find((l) => l.id === currentVideoId);
  const lessonIndex = curriculum?.lessons.findIndex((l) => l.id === currentVideoId) ?? -1;
  const prevLesson = lessonIndex > 0 ? curriculum?.lessons[lessonIndex - 1] : undefined;
  const nextLesson =
    curriculum && lessonIndex >= 0 && lessonIndex < curriculum.lessons.length - 1
      ? curriculum.lessons[lessonIndex + 1]
      : undefined;

  const goToLesson = (id: number) => {
    void flushProgress(false);
    navigate(`/player/${currentCourseId}/${id}`);
  };

  if (loadingCurriculum) {
    return (
      <PageWrapper>
        <div className={styles.page}>
          <div className={styles.loading}>
            <Spinner />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (curriculumError || !curriculum) {
    return (
      <PageWrapper>
        <div className={styles.page}>
          <div className={styles.error}>
            <HiOutlineLockClosed size={48} />
            <h2>{curriculumError || 'Course unavailable'}</h2>
            <Link to={ROUTES.MY_LEARNING} className={styles.textLink}>
              <HiOutlineChevronLeft size={16} /> Back to My Learning
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const { course, lessons, completed_lessons, total_lessons, course_progress_pct, total_duration_sec } =
    curriculum;

  return (
    <PageWrapper>
      <div className={styles.page}>
        <header className={styles.topBar}>
          <Link to={`/courses/${course.slug}`} className={styles.backOverview}>
            <HiOutlineChevronLeft size={18} />
            Back to course overview
          </Link>
          <button
            type="button"
            className={styles.toggleSidebar}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <>
                <HiOutlineXMark size={18} /> Hide content
              </>
            ) : (
              <>
                <HiOutlineBars3 size={18} /> Show content
              </>
            )}
          </button>
        </header>

        <div className={`${styles.layout} ${!sidebarOpen ? styles.layoutNoSidebar : ''}`}>
          <div className={styles.main}>
            <div className={styles.videoShell}>
              <div className={styles.videoWrapper}>
                {loadingVideo && (
                  <div className={styles.videoLoading}>
                    <Spinner />
                  </div>
                )}
                {videoUrl && !videoError && playerKind === 'html5' ? (
                  <video
                    ref={videoRef}
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    playsInline
                    className={styles.video}
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    onError={handleVideoError}
                    onLoadedMetadata={() => {
                      const el = videoRef.current;
                      const l = currentLesson;
                      if (!el || !l || l.is_completed) return;
                      if (l.watched_sec > 0 && Number.isFinite(el.duration) && el.duration > 0) {
                        el.currentTime = Math.min(l.watched_sec, Math.max(0, el.duration - 0.5));
                      }
                    }}
                    onTimeUpdate={() => scheduleDebouncedSave()}
                    onPause={() => void flushProgress(false)}
                    onEnded={() => void flushProgress(true)}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : videoUrl && !videoError && playerKind === 'drive_iframe' ? (
                  <iframe
                    key={videoUrl}
                    src={videoUrl}
                    className={styles.driveIframe}
                    title={currentLesson?.title ?? 'Lesson video'}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : !loadingVideo ? (
                  <div className={styles.noVideo}>
                    <HiOutlineExclamationTriangle size={48} />
                    <p>{videoError || 'Video not available'}</p>
                    <button
                      type="button"
                      className={styles.retryBtn}
                      onClick={() => {
                        setVideoError('');
                        setVideoUrl(null);
                        setLoadingVideo(true);
                        client
                          .get<ApiResponse<VideoAccess>>(`/videos/${currentVideoId}`)
                          .then((res) => {
                            const data = res.data.data!;
                            setPlayerKind(data.player_kind === 'drive_iframe' ? 'drive_iframe' : 'html5');
                            setVideoUrl(normalizeUrl(data.video_url));
                          })
                          .catch(() => setVideoError('Failed to load video'))
                          .finally(() => setLoadingVideo(false));
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>
              {videoUrl && !videoError && playerKind === 'drive_iframe' && !loadingVideo && (
                <div className={styles.driveFooter}>
                  <p className={styles.driveNote}>
                    This lesson is hosted on Google Drive. When you have finished watching, mark it complete
                    so your course progress updates.
                  </p>
                  <button type="button" className={styles.markCompleteBtn} onClick={() => void markDriveLessonComplete()}>
                    Mark lesson complete
                  </button>
                </div>
              )}
            </div>

            <div className={styles.progressSummary}>
              <span>{course_progress_pct}% Complete</span>
              <span>
                {completed_lessons}/{total_lessons} lessons done
              </span>
            </div>
            <div className={styles.courseProgressBar}>
              <div
                className={styles.courseProgressFill}
                style={{ width: `${Math.min(100, course_progress_pct)}%` }}
              />
            </div>

            <div className={styles.lessonMeta}>
              {course.category_name && (
                <span className={styles.categoryPill}>{course.category_name}</span>
              )}
              <h1 className={styles.lessonTitle}>{currentLesson?.title ?? 'Lesson'}</h1>
              {currentLesson?.description && (
                <p className={styles.lessonDesc}>{currentLesson.description}</p>
              )}
            </div>

            <nav className={styles.lessonNav}>
              {prevLesson ? (
                <button type="button" className={styles.navBtn} onClick={() => goToLesson(prevLesson.id)}>
                  <HiOutlineChevronLeft size={18} /> Previous
                </button>
              ) : (
                <span />
              )}
              {nextLesson ? (
                <button type="button" className={styles.navBtn} onClick={() => goToLesson(nextLesson.id)}>
                  Next <HiOutlineChevronRight size={18} />
                </button>
              ) : (
                <span />
              )}
            </nav>
          </div>

          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
            <h2 className={styles.sidebarTitle}>Course Content</h2>
            <div className={styles.sidebarCourse}>
              <span className={styles.sidebarCourseName}>{course.title}</span>
            </div>
            <p className={styles.sidebarStats}>
              {completed_lessons}/{total_lessons} Done · {formatTotalDurationSeconds(total_duration_sec)}
            </p>
            <ul className={styles.lessonList}>
              {lessons.map((lesson) => {
                const active = lesson.id === currentVideoId;
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className={`${styles.lessonItem} ${active ? styles.lessonItemActive : ''}`}
                      onClick={() => goToLesson(lesson.id)}
                    >
                      <div className={styles.lessonItemTop}>
                        <HiOutlinePlayCircle size={16} className={styles.lessonPlayIcon} />
                        <span className={styles.lessonItemTitle}>{lesson.title}</span>
                        {lesson.is_preview && <span className={styles.freeTag}>Preview</span>}
                      </div>
                      <div className={styles.lessonItemMeta}>
                        {lesson.duration_sec != null && (
                          <span>{formatVideoTime(lesson.duration_sec)}</span>
                        )}
                      </div>
                      <div className={styles.lessonMiniBar}>
                        <div
                          className={styles.lessonMiniFill}
                          style={{ width: `${lesson.lesson_progress_pct}%` }}
                        />
                      </div>
                      <span className={styles.lessonPct}>{lesson.lesson_progress_pct}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </div>
    </PageWrapper>
  );
}
