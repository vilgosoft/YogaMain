import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface UsePlayerFullscreenOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  /** iOS native video fullscreen; disable when there is no <video> (e.g. iframe embed). */
  allowIOSVideoFullscreen?: boolean;
}

export function usePlayerFullscreen({
  videoRef,
  containerRef,
  allowIOSVideoFullscreen = true,
}: UsePlayerFullscreenOptions) {
  const [inFullscreenUi, setInFullscreenUi] = useState(false);

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

  const toggleFullscreen = useCallback(async () => {
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
    const box = containerRef.current;
    const v = video as
      | (HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
          webkitDisplayingFullscreen?: boolean;
        })
      | null;

    if (allowIOSVideoFullscreen && v && typeof v.webkitEnterFullscreen === 'function') {
      if (v.webkitDisplayingFullscreen) return;
      try {
        v.webkitEnterFullscreen();
        return;
      } catch {
        /* fall through to container fullscreen */
      }
    }

    if (box?.requestFullscreen) {
      await box.requestFullscreen();
      return;
    }
    await (box as HTMLElement & { webkitRequestFullscreen?: () => void })?.webkitRequestFullscreen?.();
  }, [allowIOSVideoFullscreen, containerRef, videoRef]);

  return { inFullscreenUi, toggleFullscreen };
}
