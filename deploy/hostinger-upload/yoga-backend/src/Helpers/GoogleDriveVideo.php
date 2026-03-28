<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Parse Google Drive share links and build an embeddable preview URL.
 * Files must be shared so "Anyone with the link" can view.
 */
final class GoogleDriveVideo
{
    public static function extractFileId(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }

        if (preg_match('#drive\.google\.com/file/d/([a-zA-Z0-9_-]+)#', $url, $m)) {
            return $m[1];
        }

        if (preg_match('#drive\.google\.com/open\?[^#]*id=([a-zA-Z0-9_-]+)#', $url, $m)) {
            return $m[1];
        }

        if (preg_match('#[?&]id=([a-zA-Z0-9_-]+)#', $url, $m)) {
            $host = parse_url($url, PHP_URL_HOST);
            if (is_string($host) && str_contains($host, 'drive.google.com')) {
                return $m[1];
            }
        }

        return null;
    }

    public static function isDriveUrl(string $url): bool
    {
        $host = parse_url(trim($url), PHP_URL_HOST);

        return is_string($host) && str_contains($host, 'drive.google.com');
    }

    public static function toPreviewUrl(string $url): ?string
    {
        $id = self::extractFileId($url);

        return $id ? 'https://drive.google.com/file/d/' . $id . '/preview' : null;
    }
}
