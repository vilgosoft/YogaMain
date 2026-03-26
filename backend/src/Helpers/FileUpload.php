<?php

namespace App\Helpers;

class FileUpload
{
    private static array $imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private static array $videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];

    /**
     * Get the public uploads directory.
     * On Hostinger: /home/u.../domains/site/public_html/uploads
     * Locally: backend/storage (fallback)
     */
    private static function getUploadsDir(): string
    {
        // If UPLOADS_PATH is explicitly set, use it
        if (!empty($_ENV['UPLOADS_PATH'])) {
            return rtrim($_ENV['UPLOADS_PATH'], '/');
        }

        // Auto-detect: find public_html relative to current working directory
        // On Hostinger, the API entry is at public_html/api/index.php
        // So public_html is 2 levels up from the api dir
        $publicHtml = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if ($publicHtml && is_dir($publicHtml)) {
            return $publicHtml . '/uploads';
        }

        // Fallback for local dev
        return ($_ENV['STORAGE_PATH'] ?? './storage');
    }

    /**
     * Get the public URL prefix for uploaded files.
     */
    private static function getUrlPrefix(): string
    {
        if (!empty($_ENV['UPLOADS_URL'])) {
            return rtrim($_ENV['UPLOADS_URL'], '/');
        }

        // If using public_html/uploads, URL is just /uploads
        $publicHtml = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if ($publicHtml && is_dir($publicHtml)) {
            return '/uploads';
        }

        // Fallback for local dev (served through /api/storage proxy or similar)
        return '/api/storage';
    }

    public static function handleImage(array $file, string $subDir = 'thumbnails'): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) return null;

        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, self::$imageMimes, true)) {
            Response::error('Invalid image type. Allowed: JPG, PNG, WebP, GIF', 'INVALID_FILE', 400);
            return null;
        }

        if ($file['size'] > 5 * 1024 * 1024) {
            Response::error('Image must be under 5MB', 'FILE_TOO_LARGE', 400);
            return null;
        }

        $uploadsDir = self::getUploadsDir() . '/' . $subDir;
        if (!is_dir($uploadsDir)) {
            if (!@mkdir($uploadsDir, 0755, true)) {
                Response::error('Failed to create upload directory: ' . $uploadsDir, 'UPLOAD_FAILED', 500);
                return null;
            }
        }

        $ext = self::getExtension($mime);
        $filename = uniqid('img_', true) . '.' . $ext;
        $destination = $uploadsDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Failed to save image to: ' . $destination . '. Check folder permissions (need 755).', 'UPLOAD_FAILED', 500);
            return null;
        }

        // Return full URL path (accessible via browser)
        return self::getUrlPrefix() . '/' . $subDir . '/' . $filename;
    }

    public static function handleVideo(array $file): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE   => 'Video exceeds server upload limit. Contact hosting to increase upload_max_filesize.',
                UPLOAD_ERR_FORM_SIZE  => 'Video exceeds form upload limit.',
                UPLOAD_ERR_PARTIAL    => 'Video was only partially uploaded. Try again.',
                UPLOAD_ERR_NO_FILE    => 'No video file was uploaded.',
                UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory missing.',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write video to disk. Check permissions.',
                UPLOAD_ERR_EXTENSION  => 'Upload blocked by PHP extension.',
            ];
            $msg = $errors[$file['error']] ?? 'Upload error code: ' . $file['error'];
            Response::error($msg, 'UPLOAD_FAILED', 400);
            return null;
        }

        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, self::$videoMimes, true)) {
            Response::error('Invalid video type. Allowed: MP4, MOV, AVI, WebM, MKV', 'INVALID_FILE', 400);
            return null;
        }

        if ($file['size'] > 500 * 1024 * 1024) {
            Response::error('Video must be under 500MB', 'FILE_TOO_LARGE', 400);
            return null;
        }

        $uploadsDir = self::getUploadsDir() . '/videos';
        if (!is_dir($uploadsDir)) {
            if (!@mkdir($uploadsDir, 0755, true)) {
                Response::error('Failed to create upload directory: ' . $uploadsDir, 'UPLOAD_FAILED', 500);
                return null;
            }
        }

        $ext = self::getExtension($mime);
        $filename = uniqid('vid_', true) . '.' . $ext;
        $destination = $uploadsDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Failed to save video to: ' . $destination . '. Check folder permissions (need 755).', 'UPLOAD_FAILED', 500);
            return null;
        }

        // Return full URL path
        return self::getUrlPrefix() . '/videos/' . $filename;
    }

    private static function getExtension(string $mime): string
    {
        $map = [
            'image/jpeg'         => 'jpg',
            'image/png'          => 'png',
            'image/webp'         => 'webp',
            'image/gif'          => 'gif',
            'video/mp4'          => 'mp4',
            'video/quicktime'    => 'mov',
            'video/x-msvideo'    => 'avi',
            'video/webm'         => 'webm',
            'video/x-matroska'   => 'mkv',
        ];
        return $map[$mime] ?? 'bin';
    }
}
