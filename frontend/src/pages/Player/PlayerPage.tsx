import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
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
  const plyrRef = useRef<Plyr | null>(null);
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
        setVideoUrl(data.player_kind === 'drive_iframe' ? data.video_url : normalizeUrl(data.video_url));
      })
      .catch((err) => {
        if (err.response?.status === 403) setVideoError('You must be enrolled to watch this lesson.');
        else if (err.response?.status === 401) navigate(ROUTES.LOGIN);
        else setVideoError(err.response?.data?.error?.message || 'Failed to load video');
      })
      .finally(() => setLoadingVideo(false));
  }, [currentVideoId, normalizeUrl, navigate]);

  // Initialize Plyr for HTML5 videos
  useEffect(() => {
    if (!videoRef.current || !videoUrl || playerKind !== 'html5') return;

    const timer = setTimeout(() => {
      if (!videoRef.current) return;
      plyrRef.current?.destroy();

      plyrRef.current = new Plyr(videoRef.current, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'fullscreen',
        ],
        settings: ['speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        tooltips: { controls: true, seek: true },
        keyboard: { focused: true, global: false },
        resetOnEnd: false,
        invertTime: false,
      });

      // Resume from last position
      plyrRef.current.on('loadedmetadata', () => {
        const lesson = curriculum?.lessons.find((l) => l.id === currentVideoId);
        if (lesson && !lesson.is_completed && lesson.watched_sec > 0 && plyrRef.current) {
          const dur = plyrRef.current.duration;
          if (dur > 0) {
            plyrRef.current.currentTime = Math.min(lesson.watched_sec, Math.max(0, dur - 0.5));
          }
        }
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      plyrRef.current?.destroy();
      plyrRef.current = null;
    };
  }, [videoUrl, playerKind, curriculum, currentVideoId]);

  const flushProgress = useCallback(
    async (markComplete: boolean) => {
      const sec = plyrRef.current ? Math.floor(plyrRef.current.currentTime) : 0;
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

  const markLessonComplete = useCallback(async () => {
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
        setVideoUrl(data.player_kind === 'drive_iframe' ? data.video_url : normalizeUrl(data.video_url));
      })
      .catch(() => setVideoError('Failed to load video'))
      .finally(() => setLoadingVideo(false));
  };

  /* ── Loading ── */
  if (loadingCurriculum) {
    return (
      <PageWrapper><div className={styles.page}><div className={styles.loading}><Spinner /></div></div></PageWrapper>
    );
  }

  /* ── Error ── */
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
            <span className={styles.topProgress}>{completed_lessons}/{total_lessons} lessons</span>
            <button type="button" className={styles.lessonsBtn} onClick={() => setSidebarOpen((o) => !o)}>
              {sidebarOpen ? <HiOutlineXMark size={18} /> : <HiOutlineBars3 size={18} />}
              <span>Lessons</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className={styles.content}>
          {/* ── Video area ── */}
          {loadingVideo ? (
            <div className={styles.placeholder}><Spinner /></div>
          ) : videoError ? (
            <div className={styles.placeholder}>
              <HiOutlineExclamationTriangle size={36} />
              <p>{videoError}</p>
              <button type="button" className={styles.retryBtn} onClick={retryLoadVideo}>Retry</button>
            </div>
          ) : videoUrl && !isDrive ? (
            /* ── Plyr HTML5 player ── */
            <div className={styles.plyrWrap}>
              <video
                ref={videoRef}
                key={videoUrl}
                playsInline
                onPause={() => void flushProgress(false)}
                onEnded={() => void flushProgress(true)}
                onTimeUpdate={scheduleDebouncedSave}
                onError={() => setVideoError('Unable to play this video.')}
                onContextMenu={(e) => e.preventDefault()}
              >
                <source src={videoUrl} />
              </video>
            </div>
          ) : videoUrl && isDrive ? (
            /* ── Google Drive iframe ── */
            <div className={styles.driveWrap}>
              <iframe
                key={videoUrl}
                src={videoUrl}
                title={currentLesson?.title ?? 'Lesson'}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          {/* Mark complete for Drive lessons */}
          {isDrive && videoUrl && !videoError && !loadingVideo && (
            <div className={styles.markRow}>
              {currentLesson?.is_completed ? (
                <span className={styles.doneBadge}><HiOutlineCheckCircle size={16} /> Completed</span>
              ) : (
                <button type="button" className={styles.markBtn} onClick={() => void markLessonComplete()}>
                  Mark lesson complete
                </button>
              )}
            </div>
          )}

          {/* Lesson info */}
          <div className={styles.info}>
            {course.category_name && <span className={styles.pill}>{course.category_name}</span>}
            <h1 className={styles.title}>{currentLesson?.title ?? 'Lesson'}</h1>
            {currentLesson?.description && <p className={styles.desc}>{currentLesson.description}</p>}

            <div className={styles.progressRow}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${course_progress_pct}%` }} />
              </div>
              <span className={styles.progressPct}>{course_progress_pct}%</span>
            </div>

            <div className={styles.nav}>
              {prevLesson
                ? <button type="button" className={styles.navBtn} onClick={() => goToLesson(prevLesson.id)}><HiOutlineChevronLeft size={16} /> Previous</button>
                : <span />}
              {nextLesson
                ? <button type="button" className={styles.navBtn} onClick={() => goToLesson(nextLesson.id)}>Next <HiOutlineChevronRight size={16} /></button>
                : <span />}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHead}>
            <h2 className={styles.sidebarTitle}>Course Content</h2>
            <button type="button" className={styles.sidebarCloseBtn} onClick={() => setSidebarOpen(false)}>
              <HiOutlineXMark size={20} />
            </button>
          </div>
          <p className={styles.sidebarStats}>{completed_lessons}/{total_lessons} lessons · {formatTotalDurationSeconds(total_duration_sec)}</p>
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
