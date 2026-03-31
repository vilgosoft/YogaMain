import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Button } from '@/components/ui/Button/Button';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { ROUTES } from '@/utils/constants';
import { formatVideoTime, formatTotalDurationSeconds } from '@/utils/formatters';
import { recomputeLessonLocks } from '@/utils/playerLessonLocks';
import {
  HiOutlinePlayCircle,
  HiOutlineLockClosed,
  HiOutlineChevronLeft,
  HiOutlineExclamationTriangle,
  HiOutlineChevronRight,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineArrowsPointingOut,
  HiOutlineArrowsPointingIn,
} from 'react-icons/hi2';
import styles from './PlayerPage.module.scss';

interface VideoAccess {
  video_url: string;
  title: string;
  player_kind?: 'html5' | 'drive_iframe';
  /** Absolute URL to WebVTT; used only for the HTML5 video element */
  captions_url?: string | null;
  /** Drive /preview embed when the direct uc stream cannot play in the video element */
  drive_iframe_fallback_url?: string | null;
}

/**
 * When API serves Drive /preview as video_url (player_kind drive_iframe), map it to a direct file URL
 * for the HTML5 <video> element (same pattern as backend GoogleDriveVideo::toDirectStreamUrl).
 */
function driveStreamUrlFromGooglePlayerUrl(url: string): string | null {
  const fileD = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileD) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileD[1])}`;
  }
  const openId = url.match(/drive\.google\.com\/open\?[^#]*\bid=([a-zA-Z0-9_-]+)/i);
  if (openId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(openId[1])}`;
  }
  if (/drive\.google\.com\/uc\?/i.test(url)) {
    return url;
  }
  return null;
}

function resolveLessonVideoSrc(playerKind: 'html5' | 'drive_iframe', videoUrl: string): string {
  if (playerKind === 'html5') return videoUrl;
  return driveStreamUrlFromGooglePlayerUrl(videoUrl) ?? videoUrl;
}

function extractDriveFileId(url: string): string | null {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (m2 && /drive\.google\.com/i.test(url)) return m2[1];
  return null;
}

/** Try several direct URLs before falling back to Drive’s /preview iframe (avoids Drive’s share icon + stacked mobile UI). */
function driveHtml5SourceCandidates(
  playerKind: 'html5' | 'drive_iframe',
  videoUrl: string,
  resolvedSrc: string
): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    if (u && !out.includes(u)) out.push(u);
  };
  push(resolvedSrc);
  const id = extractDriveFileId(videoUrl) || extractDriveFileId(resolvedSrc);
  const isDriveStream =
    playerKind === 'drive_iframe' ||
    /drive\.google\.com\/uc\?/i.test(resolvedSrc) ||
    /drive\.usercontent\.google\.com/i.test(resolvedSrc);
  if (id && isDriveStream) {
    push(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`);
    push(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download`);
  }
  return out;
}

/** Mobile lesson drawer / sidebar */
const MOBILE_LAYOUT_MQ = '(max-width: 1023px)';

export function PlayerPage() {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const html5CandidatesRef = useRef<string[]>([]);
  const curriculumRef = useRef<PlayerCurriculumResponse | null>(null);
  const lessonListRef = useRef<HTMLUListElement>(null);

  const [curriculum, setCurriculum] = useState<PlayerCurriculumResponse | null>(null);
  const [curriculumError, setCurriculumError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captionsUrl, setCaptionsUrl] = useState<string | null>(null);
  const [playerKind, setPlayerKind] = useState<'html5' | 'drive_iframe'>('html5');
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [videoError, setVideoError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [markCompleteError, setMarkCompleteError] = useState('');
  /** In-page Drive /preview when direct stream fails in the video element */
  const [driveEmbedPreview, setDriveEmbedPreview] = useState<string | null>(null);
  const [useDriveEmbed, setUseDriveEmbed] = useState(false);
  /** Index into direct Drive stream URLs tried before iframe fallback */
  const [driveHtml5Attempt, setDriveHtml5Attempt] = useState(0);
  const [inFullscreenUi, setInFullscreenUi] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia(MOBILE_LAYOUT_MQ).matches) {
      setSidebarOpen(false);
    }
  }, []);

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
      .then((data) =>
        setCurriculum({
          ...data,
          lessons: recomputeLessonLocks(data.lessons),
        })
      )
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
    if (!currentVideoId || !curriculum) return;

    const lesson = curriculum.lessons.find((l) => l.id === currentVideoId);
    if (lesson?.is_locked) {
      setLoadingVideo(false);
      setVideoError('');
      setVideoUrl(null);
      setCaptionsUrl(null);
      setDriveEmbedPreview(null);
      setUseDriveEmbed(false);
      setDriveHtml5Attempt(0);
      setPlayerKind('html5');
      return;
    }

    setLoadingVideo(true);
    setVideoError('');
    setVideoUrl(null);
    setCaptionsUrl(null);
    setDriveEmbedPreview(null);
    setUseDriveEmbed(false);
    setDriveHtml5Attempt(0);
    setPlayerKind('html5');

    client
      .get<ApiResponse<VideoAccess>>(`/videos/${currentVideoId}`)
      .then((res) => {
        const data = res.data.data!;
        const kind = data.player_kind === 'drive_iframe' ? 'drive_iframe' : 'html5';
        const primary = normalizeUrl(data.video_url);
        setPlayerKind(kind);
        setVideoUrl(primary);
        const cap = data.captions_url?.trim();
        setCaptionsUrl(cap ? normalizeUrl(cap) : null);
        const fb = data.drive_iframe_fallback_url?.trim();
        const normalizedFb = fb ? normalizeUrl(fb) : null;
        setDriveEmbedPreview(normalizedFb ?? (kind === 'drive_iframe' ? primary : null));
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
  }, [currentVideoId, curriculum, normalizeUrl, navigate]);

  // Must run every render — do not place after early returns (would break Rules of Hooks → React #310).
  useEffect(() => {
    if (!currentVideoId) return;
    const root = lessonListRef.current;
    if (!root) return;
    const activeEl = root.querySelector<HTMLElement>('[data-lesson-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentVideoId]);

  // Keep player in the viewport: no body scroll; lesson list scrolls inside the sidebar.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevRootHeight = root?.style.height ?? '';
    const prevRootOverflow = root?.style.overflow ?? '';
    const prevRootMinH = root?.style.minHeight ?? '';

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (root) {
      root.style.minHeight = '100dvh';
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      if (root) {
        root.style.height = prevRootHeight;
        root.style.overflow = prevRootOverflow;
        root.style.minHeight = prevRootMinH;
      }
    };
  }, []);

  const handleMarkLessonComplete = useCallback(async () => {
    const lesson = curriculumRef.current?.lessons.find((l) => l.id === currentVideoId);
    if (!lesson || lesson.is_locked || lesson.is_completed || !currentVideoId) return;

    setMarkCompleteError('');
    setMarkingComplete(true);

    const dur = lesson.duration_sec ?? 0;
    let watched: number;
    if (videoRef.current) {
      const t = Math.floor(videoRef.current.currentTime);
      watched = dur > 0 ? Math.max(dur, t) : Math.max(1, t);
    } else if (dur > 0) {
      watched = dur;
    } else {
      watched = 1;
    }

    try {
      const { course_progress_pct } = await postVideoProgress(currentVideoId, {
        watched_sec: watched,
        mark_complete: true,
      });
      setCurriculum((prev) => {
        if (!prev) return prev;
        const lessons: PlayerLesson[] = prev.lessons.map((les) => {
          if (les.id !== currentVideoId) return les;
          return {
            ...les,
            watched_sec: watched,
            is_completed: true,
            lesson_progress_pct: 100,
          };
        });
        const withLocks = recomputeLessonLocks(lessons);
        return {
          ...prev,
          lessons: withLocks,
          completed_lessons: withLocks.filter((l) => l.is_completed).length,
          course_progress_pct,
        };
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setMarkCompleteError(ax.response?.data?.error?.message || 'Could not save. Try again.');
    } finally {
      setMarkingComplete(false);
    }
  }, [currentVideoId]);

  const html5Candidates = useMemo(() => {
    if (!videoUrl || loadingVideo) return [];
    const lesson = curriculum?.lessons.find((l) => l.id === currentVideoId);
    if (lesson?.is_locked) return [];
    if (playerKind !== 'html5' && playerKind !== 'drive_iframe') return [];
    const base = resolveLessonVideoSrc(playerKind, videoUrl);
    return driveHtml5SourceCandidates(playerKind, videoUrl, base);
  }, [videoUrl, playerKind, loadingVideo, curriculum, currentVideoId]);

  html5CandidatesRef.current = html5Candidates;

  const handleVideoError = useCallback(() => {
    if (!useDriveEmbed) {
      const list = html5CandidatesRef.current;
      const next = driveHtml5Attempt + 1;
      if (next < list.length) {
        setDriveHtml5Attempt(next);
        setVideoError('');
        return;
      }
      if (driveEmbedPreview) {
        setUseDriveEmbed(true);
        setVideoError('');
        return;
      }
    }
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
  }, [useDriveEmbed, driveEmbedPreview, driveHtml5Attempt]);

  const activeHtml5Src = useMemo(() => {
    const locked = curriculum?.lessons.find((l) => l.id === currentVideoId)?.is_locked === true;
    if (locked || loadingVideo || useDriveEmbed || videoError) return null;
    if (!html5Candidates.length) return null;
    const i = Math.min(driveHtml5Attempt, html5Candidates.length - 1);
    return html5Candidates[i] ?? null;
  }, [
    curriculum,
    currentVideoId,
    loadingVideo,
    useDriveEmbed,
    videoError,
    html5Candidates,
    driveHtml5Attempt,
  ]);

  useEffect(() => {
    const syncDoc = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setInFullscreenUi(!!(document.fullscreenElement ?? doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', syncDoc);
    document.addEventListener('webkitfullscreenchange', syncDoc);
    syncDoc();
    return () => {
      document.removeEventListener('fullscreenchange', syncDoc);
      document.removeEventListener('webkitfullscreenchange', syncDoc);
    };
  }, []);

  const togglePlayerFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const fsEl = document.fullscreenElement ?? doc.webkitFullscreenElement;
    if (fsEl) {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      } else {
        await doc.webkitExitFullscreen?.().catch(() => {});
      }
      return;
    }

    const video = videoRef.current;
    const box = playerBoxRef.current;
    const v = video as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    }) | null;

    if (activeHtml5Src && v && typeof v.webkitEnterFullscreen === 'function') {
      if (v.webkitDisplayingFullscreen) return;
      try {
        v.webkitEnterFullscreen();
        return;
      } catch {
        /* fall through to element fullscreen */
      }
    }

    const el = box;
    if (el?.requestFullscreen) {
      await el.requestFullscreen();
      return;
    }
    await (el as HTMLElement & { webkitRequestFullscreen?: () => void })?.webkitRequestFullscreen?.();
  }, [activeHtml5Src]);

  curriculumRef.current = curriculum;

  const currentLesson = curriculum?.lessons.find((l) => l.id === currentVideoId);
  const lessonIndex = curriculum?.lessons.findIndex((l) => l.id === currentVideoId) ?? -1;
  const prevLesson = lessonIndex > 0 ? curriculum?.lessons[lessonIndex - 1] : undefined;
  const nextLesson =
    curriculum && lessonIndex >= 0 && lessonIndex < curriculum.lessons.length - 1
      ? curriculum.lessons[lessonIndex + 1]
      : undefined;

  const goToLesson = (id: number) => {
    if (!curriculum) return;
    const target = curriculum.lessons.find((l) => l.id === id);
    if (target?.is_locked) return;
    if (typeof window !== 'undefined' && window.matchMedia(MOBILE_LAYOUT_MQ).matches) {
      setSidebarOpen(false);
    }
    navigate(`/player/${currentCourseId}/${id}`);
  };

  if (loadingCurriculum) {
    return (
      <PageWrapper variant="fluid">
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
      <PageWrapper variant="fluid">
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

  const { course, lessons, completed_lessons, total_lessons, total_duration_sec } = curriculum;
  const completionPct =
    total_lessons > 0 ? Math.min(100, Math.round((completed_lessons / total_lessons) * 100)) : 0;

  const isCurrentLocked = currentLesson?.is_locked === true;

  return (
    <PageWrapper variant="fluid">
      <div className={`${styles.page} ${styles.playerRoot}`}>
        <header className={styles.topBar}>
          <Link to={`/courses/${course.slug}`} className={styles.backOverview}>
            <HiOutlineChevronLeft size={18} aria-hidden />
            <span className={styles.backOverviewFull}>Back to course overview</span>
            <span className={styles.backOverviewShort}>Back</span>
          </Link>
          <button
            type="button"
            className={styles.toggleSidebar}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <>
                <HiOutlineXMark size={18} /> Close
              </>
            ) : (
              <>
                <HiOutlineBars3 size={18} /> Lessons
              </>
            )}
          </button>
        </header>

        {sidebarOpen && (
          <button
            type="button"
            className={styles.sidebarBackdrop}
            aria-label="Close lesson list"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={`${styles.layout} ${!sidebarOpen ? styles.layoutNoSidebar : ''}`}>
          <div className={styles.main}>
            <div className={styles.videoShell}>
              <div className={styles.videoStage}>
                <div className={styles.videoWrapper} ref={playerBoxRef}>
                {isCurrentLocked ? (
                  <div className={styles.noVideo}>
                    <HiOutlineLockClosed size={48} aria-hidden />
                    <p>Mark the previous lesson as complete to unlock this one.</p>
                    {prevLesson && (
                      <button
                        type="button"
                        className={styles.retryBtn}
                        onClick={() => goToLesson(prevLesson.id)}
                      >
                        Go to previous lesson
                      </button>
                    )}
                  </div>
                ) : loadingVideo ? (
                  <div className={styles.videoLoading}>
                    <Spinner />
                  </div>
                ) : useDriveEmbed && driveEmbedPreview ? (
                  <div className={styles.driveEmbedOuter}>
                    <div className={styles.driveEmbedShell}>
                      <iframe
                        key={driveEmbedPreview}
                        src={driveEmbedPreview}
                        className={styles.driveIframe}
                        title={currentLesson?.title ?? 'Lesson video'}
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                        referrerPolicy="no-referrer"
                        {...({ credentialless: true } as Record<string, unknown>)}
                      />
                    </div>
                  </div>
                ) : activeHtml5Src ? (
                  <video
                    ref={videoRef}
                    key={`${activeHtml5Src}|${captionsUrl ?? ''}`}
                    src={activeHtml5Src}
                    controls
                    playsInline
                    className={styles.video}
                    preload="metadata"
                    onContextMenu={(e) => e.preventDefault()}
                    onError={handleVideoError}
                    onLoadedMetadata={() => {
                      const el = videoRef.current;
                      const l = currentLesson;
                      if (!el) return;
                      if (
                        l &&
                        !l.is_completed &&
                        l.watched_sec > 0 &&
                        Number.isFinite(el.duration) &&
                        el.duration > 0
                      ) {
                        el.currentTime = Math.min(l.watched_sec, Math.max(0, el.duration - 0.5));
                      }
                    }}
                  >
                    {captionsUrl ? (
                      <track kind="captions" src={captionsUrl} srcLang="en" label="English" default />
                    ) : null}
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className={styles.noVideo}>
                    <HiOutlineExclamationTriangle size={48} />
                    <p>{videoError || 'Video not available'}</p>
                    <button
                      type="button"
                      className={styles.retryBtn}
                      onClick={() => {
                        setVideoError('');
                        setUseDriveEmbed(false);
                        setDriveHtml5Attempt(0);
                        setVideoUrl(null);
                        setCaptionsUrl(null);
                        setDriveEmbedPreview(null);
                        setLoadingVideo(true);
                        client
                          .get<ApiResponse<VideoAccess>>(`/videos/${currentVideoId}`)
                          .then((res) => {
                            const data = res.data.data!;
                            const kind = data.player_kind === 'drive_iframe' ? 'drive_iframe' : 'html5';
                            const primary = normalizeUrl(data.video_url);
                            setPlayerKind(kind);
                            setVideoUrl(primary);
                            const cap = data.captions_url?.trim();
                            setCaptionsUrl(cap ? normalizeUrl(cap) : null);
                            const fb = data.drive_iframe_fallback_url?.trim();
                            const normalizedFb = fb ? normalizeUrl(fb) : null;
                            setDriveEmbedPreview(normalizedFb ?? (kind === 'drive_iframe' ? primary : null));
                          })
                          .catch(() => setVideoError('Failed to load video'))
                          .finally(() => setLoadingVideo(false));
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!isCurrentLocked && !loadingVideo && (activeHtml5Src || (useDriveEmbed && driveEmbedPreview)) ? (
                  <button
                    type="button"
                    className={styles.playerFullscreenBtn}
                    onClick={() => void togglePlayerFullscreen()}
                    aria-label={inFullscreenUi ? 'Exit fullscreen' : 'Enter fullscreen'}
                    title={inFullscreenUi ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {inFullscreenUi ? (
                      <HiOutlineArrowsPointingIn size={22} aria-hidden />
                    ) : (
                      <HiOutlineArrowsPointingOut size={22} aria-hidden />
                    )}
                  </button>
                ) : null}
                </div>
              </div>
            </div>

            <div className={styles.courseProgressBlock}>
              <div className={styles.courseProgressTrack} aria-hidden>
                <div
                  className={styles.courseProgressFill}
                  style={{ width: `${Math.min(100, completionPct)}%` }}
                />
              </div>
              <p className={styles.courseProgressCaption}>
                <span className={styles.courseProgressCaptionLead}>{completionPct}% complete</span>
                <span className={styles.courseProgressDot} aria-hidden>
                  ·
                </span>
                <span>
                  {completed_lessons}/{total_lessons} lessons
                </span>
              </p>
            </div>

            <div className={styles.lessonMeta}>
              {course.category_name && (
                <span className={styles.categoryPill}>{course.category_name}</span>
              )}
              <div className={styles.lessonTitleRow}>
                <h1 className={styles.lessonTitle}>{currentLesson?.title ?? 'Lesson'}</h1>
                {currentLesson && !isCurrentLocked && !currentLesson.is_completed ? (
                  <div className={styles.markCompleteActions}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={markingComplete}
                      icon={<HiOutlineCheckCircle size={18} aria-hidden />}
                      onClick={() => void handleMarkLessonComplete()}
                    >
                      Mark lesson as complete
                    </Button>
                  </div>
                ) : null}
              </div>
              {markCompleteError ? <p className={styles.markCompleteError}>{markCompleteError}</p> : null}
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
                <button
                  type="button"
                  className={styles.navBtn}
                  disabled={nextLesson.is_locked}
                  onClick={() => goToLesson(nextLesson.id)}
                >
                  Next <HiOutlineChevronRight size={18} />
                </button>
              ) : (
                <span />
              )}
            </nav>
          </div>

          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>Course Content</h2>
              <button
                type="button"
                className={styles.sidebarCloseBtn}
                aria-label="Close lesson list"
                onClick={() => setSidebarOpen(false)}
              >
                <HiOutlineXMark size={24} aria-hidden />
              </button>
            </div>
            <div className={styles.sidebarCourse}>
              <span className={styles.sidebarCourseName}>{course.title}</span>
            </div>
            <p className={styles.sidebarStats}>
              {completed_lessons}/{total_lessons} lessons · {formatTotalDurationSeconds(total_duration_sec)}
            </p>
            <ul ref={lessonListRef} className={styles.lessonList}>
              {lessons.map((lesson) => {
                const active = lesson.id === currentVideoId;
                const statusLabel = lesson.is_locked
                  ? 'Locked'
                  : lesson.is_completed
                    ? 'Completed'
                    : active
                      ? 'Now playing'
                      : 'Available';
                const statusClass = lesson.is_locked
                  ? styles.lessonStatusLocked
                  : lesson.is_completed
                    ? styles.lessonStatusDone
                    : active
                      ? styles.lessonStatusPlaying
                      : styles.lessonStatusAvailable;

                return (
                  <li key={lesson.id} data-lesson-active={active ? 'true' : undefined}>
                    <button
                      type="button"
                      disabled={lesson.is_locked}
                      className={`${styles.lessonItem} ${active ? styles.lessonItemActive : ''} ${
                        lesson.is_locked ? styles.lessonItemLocked : ''
                      }`}
                      onClick={() => goToLesson(lesson.id)}
                    >
                      <div className={styles.lessonItemTop}>
                        {lesson.is_locked ? (
                          <HiOutlineLockClosed size={16} className={styles.lockIconLesson} aria-hidden />
                        ) : (
                          <HiOutlinePlayCircle size={16} className={styles.lessonPlayIcon} />
                        )}
                        <span className={styles.lessonItemTitle}>{lesson.title}</span>
                        {lesson.is_preview && <span className={styles.freeTag}>Preview</span>}
                      </div>
                      <div className={styles.lessonItemMeta}>
                        {lesson.duration_sec != null && (
                          <span>{formatVideoTime(lesson.duration_sec)}</span>
                        )}
                      </div>
                      <span className={`${styles.lessonStatus} ${statusClass}`}>{statusLabel}</span>
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
