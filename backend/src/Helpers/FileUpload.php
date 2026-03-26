<?php

namespace App\Helpers;

class FileUpload
{
    private static array $imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private static array $videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];

    /**
     * Get the public uploads directory.
     *
     * Detection order:
     * 1. $_ENV['UPLOADS_PATH'] (explicit config from index.php)
     * 2. $_SERVER['DOCUMENT_ROOT']/uploads (Apache standard)
     * 3. __DIR__ based: yoga-backend is sibling of public_html on Hostinger
     *    FileUpload.php is at yoga-backend/src/Helpers/ → go up 3 levels to get
     *    the domain root, then append /public_html/uploads
     * 4. ./storage (local dev fallback)
     */
    private static function getUploadsDir(): string
    {
        // 1. Explicit env
        if (!empty($_ENV['UPLOADS_PATH'])) {
            return rtrim($_ENV['UPLOADS_PATH'], '/');
        }

        // 2. DOCUMENT_ROOT
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if ($docRoot && is_dir($docRoot . '/uploads')) {
            return $docRoot . '/uploads';
        }

        // 3. Auto-detect: this file is at yoga-backend/src/Helpers/FileUpload.php
        //    Go up 3 dirs → yoga-backend parent → look for public_html/uploads
        $domainRoot = dirname(__DIR__, 3);  // = yoga-backend directory
        $domainRoot = dirname($domainRoot); // = parent of yoga-backend (domain root)
        $publicUploads = $domainRoot . '/public_html/uploads';
        if (is_dir($domainRoot . '/public_html')) {
            // Create uploads dir if it doesn't exist
            if (!is_dir($publicUploads)) {
                @mkdir($publicUploads, 0755, true);
            }
            return $publicUploads;
        }

        // 4. Fallback for local dev
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

        // If DOCUMENT_ROOT has an uploads dir, URL is /uploads
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if ($docRoot && is_dir($docRoot . '/uploads')) {
            return '/uploads';
        }

        // Auto-detect: check if public_html exists as sibling of yoga-backend
        $domainRoot = dirname(__DIR__, 3);
        $domainRoot = dirname($domainRoot);
        if (is_dir($domainRoot . '/public_html')) {
            return '/uploads';
        }

        // Fallback for local dev (served through /api/storage proxy)
        return '/api/storage';
    }

    public static function handleImage(array $file, string $subDir = 'thumbnails'): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $msg = self::getUploadErrorMessage($file['error']);
            Response::error($msg, 'UPLOAD_FAILED', 400);
            return null;
        }

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
                Response::error('Failed to create directory: ' . $uploadsDir . ' — check permissions', 'UPLOAD_FAILED', 500);
                return null;
            }
        }

        $ext = self::getExtension($mime);
        $filename = uniqid('img_', true) . '.' . $ext;
        $destination = $uploadsDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Failed to save image to: ' . $destination . ' — check permissions (need 755)', 'UPLOAD_FAILED', 500);
            return null;
        }

        return self::getUrlPrefix() . '/' . $subDir . '/' . $filename;
    }

    public static function handleVideo(array $file): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $msg = self::getUploadErrorMessage($file['error']);
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
                Response::error('Failed to create directory: ' . $uploadsDir . ' — check permissions', 'UPLOAD_FAILED', 500);
                return null;
            }
        }

        $ext = self::getExtension($mime);
        $filename = uniqid('vid_', true) . '.' . $ext;
        $destination = $uploadsDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Failed to save video to: ' . $destination . ' — check permissions (need 755)', 'UPLOAD_FAILED', 500);
            return null;
        }

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

    private static function getUploadErrorMessage(int $code): string
    {
        $errors = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit (upload_max_filesize).',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds form upload limit.',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded. Try again.',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory missing.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write to disk. Check permissions.',
            UPLOAD_ERR_EXTENSION  => 'Upload blocked by PHP extension.',
        ];
        return $errors[$code] ?? 'Upload error code: ' . $code;
    }
}
