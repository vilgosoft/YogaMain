<?php

namespace App\Helpers;

class FileUpload
{
    private static array $imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private static array $videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];

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

        $storagePath = ($_ENV['STORAGE_PATH'] ?? './storage') . '/' . $subDir;
        if (!is_dir($storagePath)) {
            mkdir($storagePath, 0755, true);
        }

        $ext = self::getExtension($mime);
        $filename = uniqid('img_', true) . '.' . $ext;
        $destination = $storagePath . '/' . $filename;

        move_uploaded_file($file['tmp_name'], $destination);

        return "/{$subDir}/{$filename}";
    }

    public static function handleVideo(array $file): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) return null;

        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, self::$videoMimes, true)) {
            Response::error('Invalid video type. Allowed: MP4, MOV, AVI, WebM, MKV', 'INVALID_FILE', 400);
            return null;
        }

        if ($file['size'] > 500 * 1024 * 1024) {
            Response::error('Video must be under 500MB', 'FILE_TOO_LARGE', 400);
            return null;
        }

        $storagePath = ($_ENV['STORAGE_PATH'] ?? './storage') . '/videos/raw';
        if (!is_dir($storagePath)) {
            mkdir($storagePath, 0755, true);
        }

        $ext = self::getExtension($mime);
        $filename = uniqid('vid_', true) . '.' . $ext;
        $destination = $storagePath . '/' . $filename;

        move_uploaded_file($file['tmp_name'], $destination);

        return $destination;
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
