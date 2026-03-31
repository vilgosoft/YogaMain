-- Optional WebVTT subtitles URL for HTML5 playback (same-origin or CORS-enabled HTTPS URL).
ALTER TABLE videos
    ADD COLUMN captions_url VARCHAR(500) NULL DEFAULT NULL AFTER original_file;
