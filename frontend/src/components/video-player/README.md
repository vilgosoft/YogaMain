# @/components/video-player

Responsive lesson video for the LMS: **Ant Design `Card`** wrapper + **native `<video controls>`** (Ant Design does not ship a separate video player component). The app uses **`ConfigProvider`** from `antd` (see `AntConfigProvider`) so Card follows light/dark theme.

## Exports

| Export | Purpose |
|--------|---------|
| `VideoPlayer` | `forwardRef<HTMLVideoElement>` — native `controls` only; default `controlsList` trims speed/download/cast/volume slider where supported (Chromium). |
| `usePlayerFullscreen` | Optional: document + iOS fullscreen helper |
| `FullscreenButton` | Optional: corner fullscreen (not used on lesson page — native bar only) |

## Usage

```tsx
import { VideoPlayer } from '@/components/video-player';

<VideoPlayer
  ref={videoRef}
  src={url}
  sourceKey={`${url}|${captions ?? ''}`}
  tracks={captions ? [{ src: captions, label: 'English' }] : undefined}
  onError={...}
  onLoadedMetadata={...}
/>
```

Override extras: `controlsList=""` restores browser-default control chrome (still native only).

The root node renders `data-lms-video-player` for parent layout hooks.

## Publishing as an npm package (optional)

To extract: copy this folder to `packages/react-lms-video-player`, add a `package.json` with `main`/`module`/`types`, build with `tsup` or `vite build --lib`, and depend on `react` as a peer dependency.
