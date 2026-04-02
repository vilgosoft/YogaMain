import { forwardRef, useSyncExternalStore } from 'react';
import { Card } from 'antd';
import styles from './VideoPlayer.module.scss';

const LG_MEDIA = '(min-width: 1024px)';

function subscribeLgMedia(cb: () => void) {
  const mq = window.matchMedia(LG_MEDIA);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getLgMediaSnapshot() {
  return window.matchMedia(LG_MEDIA).matches;
}

function getLgMediaServerSnapshot() {
  return false;
}

function useIsLargeViewport() {
  return useSyncExternalStore(subscribeLgMedia, getLgMediaSnapshot, getLgMediaServerSnapshot);
}

export interface VideoPlayerTrack {
  src: string;
  srcLang?: string;
  label?: string;
  kind?: 'captions' | 'subtitles';
}

export interface VideoPlayerProps {
  src: string;
  /** Stable key when `src` alone is not enough (e.g. captions change) */
  sourceKey?: string;
  poster?: string;
  className?: string;
  videoClassName?: string;
  tracks?: VideoPlayerTrack[];
  preload?: 'none' | 'metadata' | 'auto';
  playsInline?: boolean;
  /** Native controls — recommended on mobile */
  nativeControls?: boolean;
  /**
   * Trim non-essential control UI (Chromium; Safari may ignore).
   * Default strips playback speed, download, remote cast UI, and volume slider (use system volume).
   */
  controlsList?: string;
  disablePictureInPicture?: boolean;
  title?: string;
  onError?: React.ReactEventHandler<HTMLVideoElement>;
  onLoadedMetadata?: React.ReactEventHandler<HTMLVideoElement>;
  onContextMenu?: React.ReactEventHandler<HTMLVideoElement>;
  children?: React.ReactNode;
}

/**
 * Ant Design–wrapped responsive HTML5 video (antd has no dedicated player; this uses Card + native `<video controls>`).
 */
export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    sourceKey,
    poster,
    className = '',
    videoClassName = '',
    tracks,
    preload = 'metadata',
    playsInline = true,
    nativeControls = true,
    controlsList = 'noplaybackrate nodownload noremoteplayback novolume',
    disablePictureInPicture = true,
    title,
    onError,
    onLoadedMetadata,
    onContextMenu,
    children,
  },
  ref
) {
  const vKey = sourceKey ?? src;
  const isLg = useIsLargeViewport();
  /* iOS/Android: Card + controlsList often mis-layer native shadow controls (double play, timeline in wrong place). */
  const effectiveControlsList = isLg ? controlsList : undefined;

  const inner = (
    <div className={styles.root}>
      <div className={styles.stage}>
        <video
          ref={ref}
          key={vKey}
          src={src}
          poster={poster}
          controls={nativeControls}
          {...(effectiveControlsList !== undefined && effectiveControlsList !== ''
            ? { controlsList: effectiveControlsList }
            : {})}
          disablePictureInPicture={disablePictureInPicture}
          playsInline={playsInline}
          preload={preload}
          className={`${styles.video} ${videoClassName}`.trim()}
          title={title}
          onError={onError}
          onLoadedMetadata={onLoadedMetadata}
          onContextMenu={onContextMenu}
        >
          {tracks?.map((t, i) => (
            <track
              key={t.src}
              kind={t.kind ?? 'captions'}
              src={t.src}
              srcLang={t.srcLang ?? 'en'}
              label={t.label ?? 'Captions'}
              default={i === 0}
            />
          ))}
          {children ?? 'Your browser does not support the video tag.'}
        </video>
      </div>
    </div>
  );

  return (
    <div className={`${styles.wrapper} ${className}`.trim()} data-lms-video-player="">
      {isLg ? (
        <Card
          bordered={false}
          hoverable={false}
          className={styles.antCard}
          styles={{ body: { padding: 0, background: 'transparent' } }}
        >
          {inner}
        </Card>
      ) : (
        inner
      )}
    </div>
  );
});
