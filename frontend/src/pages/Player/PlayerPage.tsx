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
  HiOutlineCheckCircle,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentVideoId = videoId ? parseInt(videoId, 10) : 0;
  const currentCourseId = courseId ? parseInt(courseId, 10) : 0;

  const normalizeUrl = useCallback((url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return window.location.origin + url;
    return `${window.location.origin}/${url}`;
  }, []);

  // Load curriculum
  useEffect(() => {
    if (!currentCourseId) return;
    setLoadingCurriculum(true);
    setCurriculumError('');
    getPlayerCurriculum(currentCourseId)
      .then(setCurriculum)
      .catch((err) => {
        const status = err.response?.status;
        if (status === 403) setCurriculumError('You are not enrolled in this course.');
        else if (status === 401) navigate(ROUTES.LOGIN);
        else setCurriculumError(err.response?.data?.error?.message || 'Failed to load course');
      })
      .finally(() => setLoadingCurriculum(false));
  }, [currentCourseId, navigate]);

  // Load video URL
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
        if (err.response?.status === 403) setVideoError('You must be enrolled to watch this lesson.');
        else if (err.response?.status === 401) navigate(ROUTES.LOGIN);
        else setVideoError(err.response?.data?.error?.message || 'Failed to load video');
      })
      .finally(() => setLoadingVideo(false));
  }, [currentVideoId, normalizeUrl, navigate]);

  // Resume playback position once video loads metadata
  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    const lesson = curriculum?.lessons.find((l) => l.id === currentVideoId);
    if (vid && lesson && !lesson.is_completed && lesson.watched_sec > 0) {
      vid.currentTime = Math.min(lesson.watched_sec, Math.max(0, vid.duration - 0.5));
    }
  }, [curriculum, currentVideoId]);

  const flushProgress = useCallback(
    async (markComplete: boolean) => {
      const vid = videoRef.current;
      const sec = vid ? Math.floor(vid.currentTime) : 0;
      if (!currentVideoId) return;
      try {
        const { course_progress_pct } = await postVideoProgress(currentVideoId, {
          watched_sec: sec,
          mark_complete: markComplete,
        });
        setCurriculum((prev) => {
          if (!prev) return prev;
          const dur = prev.lessons.find((l) => l.id === currentVideoId)?.duration_sec ?? 0;
          const lessons: PlayerLesson[] = prev.lessons.map((lesson) => {
            if (lesson.id !== currentVideoId) return lesson;
            const completed = markComplete || lesson.is_completed;
            let pct = lesson.lesson_progress_pct;
            if (completed) pct = 100;
            else if (dur > 0) pct = Math.min(100, Math.round((sec / dur) * 100));
            return { ...lesson, watched_sec: sec, is_completed: completed, lesson_progress_pct: pct };
          });
          return { ...prev, lessons, completed_lessons: lessons.filter((l) => l.is_completed).length, course_progress_pct };
        });
      } catch { /* non-blocking */ }
    },
    [currentVideoId],
  );

  const scheduleDebouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushProgress(false);
    }, 5000);
  }, [flushProgress]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const markDriveLessonComplete = useCallback(async () => {
    if (!currentVideoId) return;
    try {
      const { course_progress_pct } = await postVideoProgress(currentVideoId, { watched_sec: 0, mark_complete: true });
      setCurriculum((prev) => {
        if (!prev) return prev;
        const lessons: PlayerLesson[] = prev.lessons.map((lesson) =>
          lesson.id !== currentVideoId ? lesson : { ...lesson, is_completed: true, lesson_progress_pct: 100 },
        );
        return { ...prev, lessons, completed_lessons: lessons.filter((l) => l.is_completed).length, course_progress_pct };
      });
    } catch { /* non-blocking */ }
  }, [currentVideoId]);

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

  const retryLoadVideo = () => {
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
  };

  /* ── Loading state ── */
  if (loadingCurriculum) {
    return (
      <PageWrapper>
        <div className={styles.page}>
          <div className={styles.loading}><Spinner /></div>
        </div>
      </PageWrapper>
    );
  }

  /* ── Error state ── */
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

  const { course, lessons, completed_lessons, total_lessons, course_progress_pct, total_duration_sec } = curriculum;
  const isDrive = playerKind === 'drive_iframe';

  return (
    <PageWrapper>
      <div className={styles.page}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <Link to={`/courses/${course.slug}`} className={styles.backLink}>
            <HiOutlineChevronLeft size={16} /> Back
          </Link>
          <div className={styles.topRight}>
            <span className={styles.topProgress}>
              {completed_lessons}/{total_lessons} lessons
            </span>
            <button type="button" className={styles.lessonsBtn} onClick={() => setSidebarOpen((o) => !o)}>
              {sidebarOpen ? <HiOutlineXMark size={18} /> : <HiOutlineBars3 size={18} />}
              <span>Lessons</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className={styles.content}>
          {/* ── Video ── */}
          <div className={styles.videoSection}>
            {loadingVideo ? (
              <div className={styles.videoPlaceholder}>
                <Spinner />
              </div>
            ) : videoError ? (
              <div className={styles.videoPlaceholder}>
                <HiOutlineExclamationTriangle size={36} />
                <p>{videoError}</p>
                <button type="button" className={styles.retryBtn} onClick={retryLoadVideo}>Retry</button>
              </div>
            ) : videoUrl && !isDrive ? (
              <video
                ref={videoRef}
                key={videoUrl}
                src={videoUrl}
                controls
                playsInline
                controlsList="nodownload"
                className={styles.video}
                onLoadedMetadata={handleLoadedMetadata}
                onPause={() => void flushProgress(false)}
                onEnded={() => void flushProgress(true)}
                onTimeUpdate={scheduleDebouncedSave}
                onError={() => setVideoError('Unable to play this video.')}
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : videoUrl && isDrive ? (
              <iframe
                key={videoUrl}
                src={videoUrl}
                className={styles.driveIframe}
                title={currentLesson?.title ?? 'Lesson'}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : null}
          </div>

          {/* Drive mark complete */}
          {isDrive && videoUrl && !videoError && !loadingVideo && (
            <div className={styles.driveFooter}>
              {currentLesson?.is_completed ? (
                <span className={styles.completedBadge}>
                  <HiOutlineCheckCircle size={16} /> Completed
                </span>
              ) : (
                <button type="button" className={styles.markCompleteBtn} onClick={() => void markDriveLessonComplete()}>
                  Mark lesson complete
                </button>
              )}
            </div>
          )}

          {/* Lesson info */}
          <div className={styles.lessonInfo}>
            {course.category_name && <span className={styles.categoryPill}>{course.category_name}</span>}
            <h1 className={styles.lessonTitle}>{currentLesson?.title ?? 'Lesson'}</h1>
            {currentLesson?.description && <p className={styles.lessonDesc}>{currentLesson.description}</p>}

            {/* Progress */}
            <div className={styles.progressRow}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${course_progress_pct}%` }} />
              </div>
              <span className={styles.progressPct}>{course_progress_pct}%</span>
            </div>

            {/* Prev / Next */}
            <div className={styles.lessonNav}>
              {prevLesson ? (
                <button type="button" className={styles.navBtn} onClick={() => goToLesson(prevLesson.id)}>
                  <HiOutlineChevronLeft size={16} /> Previous
                </button>
              ) : <span />}
              {nextLesson ? (
                <button type="button" className={styles.navBtn} onClick={() => goToLesson(nextLesson.id)}>
                  Next <HiOutlineChevronRight size={16} />
                </button>
              ) : <span />}
            </div>
          </div>
        </div>

        {/* Sidebar overlay */}
        {sidebarOpen && <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHead}>
            <h2 className={styles.sidebarTitle}>Course Content</h2>
            <button type="button" className={styles.sidebarCloseBtn} onClick={() => setSidebarOpen(false)}>
              <HiOutlineXMark size={20} />
            </button>
          </div>
          <p className={styles.sidebarStats}>
            {completed_lessons}/{total_lessons} lessons · {formatTotalDurationSeconds(total_duration_sec)}
          </p>
          <ul className={styles.lessonList}>
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  className={`${styles.lessonItem} ${lesson.id === currentVideoId ? styles.lessonItemActive : ''}`}
                  onClick={() => { goToLesson(lesson.id); setSidebarOpen(false); }}
                >
                  <div className={styles.lessonRow}>
                    {lesson.is_completed
                      ? <HiOutlineCheckCircle size={16} className={styles.iconDone} />
                      : <HiOutlinePlayCircle size={16} className={styles.iconPlay} />}
                    <span className={styles.lessonName}>{lesson.title}</span>
                    {lesson.is_preview && <span className={styles.freeTag}>Free</span>}
                  </div>
                  {lesson.duration_sec != null && (
                    <span className={styles.lessonDur}>{formatVideoTime(lesson.duration_sec)}</span>
                  )}
                  <div className={styles.miniBar}>
                    <div className={styles.miniFill} style={{ width: `${lesson.lesson_progress_pct}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageWrapper>
  );
}
