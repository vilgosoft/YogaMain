import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
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
  const playerRef = useRef<ReactPlayer>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [curriculum, setCurriculum] = useState<PlayerCurriculumResponse | null>(null);
  const [curriculumError, setCurriculumError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playerKind, setPlayerKind] = useState<'html5' | 'drive_iframe'>('html5');
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [videoError, setVideoError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);

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
    setPlaying(false);
    setPlayed(0);
    setDuration(0);

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
      const player = playerRef.current;
      const sec = player ? Math.floor(player.getCurrentTime()) : 0;
      if (!currentVideoId) return;
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

  const isDriveLesson = playerKind === 'drive_iframe';
  const isCurrentCompleted = currentLesson?.is_completed ?? false;

  return (
    <PageWrapper>
      <div className={styles.page}>
        <header className={styles.topBar}>
          <Link to={`/courses/${course.slug}`} className={styles.backOverview}>
            <HiOutlineChevronLeft size={18} />
            <span className={styles.backText}>Back to course</span>
          </Link>
          <div className={styles.topBarRight}>
            <span className={styles.topProgress}>
              {course_progress_pct}% · {completed_lessons}/{total_lessons}
            </span>
            <button
              type="button"
              className={styles.toggleSidebar}
              onClick={() => setSidebarOpen((o) => !o)}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <HiOutlineXMark size={20} /> : <HiOutlineBars3 size={20} />}
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.main}>
            {/* Video Player */}
            <div className={styles.playerContainer}>
              {loadingVideo && (
                <div className={styles.playerOverlay}>
                  <Spinner />
                </div>
              )}

              {videoUrl && !videoError && !isDriveLesson ? (
                <ReactPlayer
                  ref={playerRef}
                  url={videoUrl}
                  playing={playing}
                  controls
                  width="100%"
                  height="100%"
                  className={styles.reactPlayer}
                  config={{
                    file: {
                      attributes: {
                        controlsList: 'nodownload',
                        playsInline: true,
                        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
                      },
                    },
                  }}
                  onReady={() => {
                    const l = currentLesson;
                    if (!l || l.is_completed) return;
                    const player = playerRef.current;
                    if (player && l.watched_sec > 0) {
                      const dur = player.getDuration();
                      if (dur > 0) {
                        player.seekTo(Math.min(l.watched_sec, Math.max(0, dur - 0.5)), 'seconds');
                      }
                    }
                  }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => {
                    setPlaying(false);
                    void flushProgress(false);
                  }}
                  onEnded={() => {
                    setPlaying(false);
                    void flushProgress(true);
                  }}
                  onProgress={({ playedSeconds }) => {
                    setPlayed(playedSeconds);
                    scheduleDebouncedSave();
                  }}
                  onDuration={(d) => setDuration(d)}
                  onError={() => setVideoError('Unable to play this video. Please try again.')}
                />
              ) : videoUrl && !videoError && isDriveLesson ? (
                <iframe
                  key={videoUrl}
                  src={videoUrl}
                  className={styles.driveIframe}
                  title={currentLesson?.title ?? 'Lesson video'}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : !loadingVideo && videoError ? (
                <div className={styles.noVideo}>
                  <HiOutlineExclamationTriangle size={40} />
                  <p>{videoError}</p>
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

            {/* Drive lesson: mark complete */}
            {isDriveLesson && videoUrl && !videoError && !loadingVideo && (
              <div className={styles.driveFooter}>
                {isCurrentCompleted ? (
                  <div className={styles.completedBadge}>
                    <HiOutlineCheckCircle size={18} />
                    Lesson completed
                  </div>
                ) : (
                  <>
                    <p className={styles.driveNote}>
                      When you finish watching, mark this lesson complete.
                    </p>
                    <button
                      type="button"
                      className={styles.markCompleteBtn}
                      onClick={() => void markDriveLessonComplete()}
                    >
                      Mark lesson complete
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Lesson info + nav */}
            <div className={styles.lessonInfo}>
              <div className={styles.lessonHeader}>
                {course.category_name && (
                  <span className={styles.categoryPill}>{course.category_name}</span>
                )}
                <h1 className={styles.lessonTitle}>{currentLesson?.title ?? 'Lesson'}</h1>
                {currentLesson?.description && (
                  <p className={styles.lessonDesc}>{currentLesson.description}</p>
                )}
              </div>

              {/* Progress bar */}
              <div className={styles.progressRow}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min(100, course_progress_pct)}%` }}
                  />
                </div>
                <span className={styles.progressLabel}>{course_progress_pct}%</span>
              </div>

              <nav className={styles.lessonNav}>
                {prevLesson ? (
                  <button type="button" className={styles.navBtn} onClick={() => goToLesson(prevLesson.id)}>
                    <HiOutlineChevronLeft size={16} /> Previous
                  </button>
                ) : (
                  <span />
                )}
                {nextLesson ? (
                  <button type="button" className={`${styles.navBtn} ${styles.navBtnNext}`} onClick={() => goToLesson(nextLesson.id)}>
                    Next <HiOutlineChevronRight size={16} />
                  </button>
                ) : (
                  <span />
                )}
              </nav>
            </div>
          </div>

          {/* Sidebar */}
          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>Course Content</h2>
              <button
                type="button"
                className={styles.sidebarClose}
                onClick={() => setSidebarOpen(false)}
              >
                <HiOutlineXMark size={20} />
              </button>
            </div>
            <p className={styles.sidebarStats}>
              {completed_lessons}/{total_lessons} lessons · {formatTotalDurationSeconds(total_duration_sec)}
            </p>
            <ul className={styles.lessonList}>
              {lessons.map((lesson) => {
                const active = lesson.id === currentVideoId;
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className={`${styles.lessonItem} ${active ? styles.lessonItemActive : ''} ${lesson.is_completed ? styles.lessonItemDone : ''}`}
                      onClick={() => {
                        goToLesson(lesson.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className={styles.lessonItemTop}>
                        {lesson.is_completed ? (
                          <HiOutlineCheckCircle size={16} className={styles.lessonCheckIcon} />
                        ) : (
                          <HiOutlinePlayCircle size={16} className={styles.lessonPlayIcon} />
                        )}
                        <span className={styles.lessonItemTitle}>{lesson.title}</span>
                        {lesson.is_preview && <span className={styles.freeTag}>Preview</span>}
                      </div>
                      <div className={styles.lessonItemBottom}>
                        {lesson.duration_sec != null && (
                          <span className={styles.lessonDuration}>{formatVideoTime(lesson.duration_sec)}</span>
                        )}
                        <div className={styles.lessonMiniBar}>
                          <div
                            className={styles.lessonMiniFill}
                            style={{ width: `${lesson.lesson_progress_pct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          {sidebarOpen && <div className={styles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />}
        </div>
      </div>
    </PageWrapper>
  );
}
