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

        // Plain /preview keeps the iframe slimmer on mobile than ?embedded=true (fewer stacked controls).
        return $id ? 'https://drive.google.com/file/d/' . rawurlencode($id) . '/preview' : null;
    }

    /**
     * Full Drive file page — reliable playback controls on mobile (unlike /preview in an iframe).
     */
    public static function toFileViewUrl(string $url): ?string
    {
        $id = self::extractFileId($url);

        return $id !== null && $id !== ''
            ? 'https://drive.google.com/file/d/' . rawurlencode($id) . '/view'
            : null;
    }

    /**
     * Direct file URL for the HTML5 video element (mobile-friendly playback).
     * Works for many "Anyone with the link" files; very large files may redirect to a virus-scan page
     * (browser then fails — client can fall back to {@see toPreviewUrl} iframe).
     *
     * Browsers follow redirects; some files still return an HTML interstitial — the API also exposes
     * the preview embed URL from the video API when direct playback fails.
     */
    public static function toDirectStreamUrl(string $url): ?string
    {
        $id = self::extractFileId($url);

        return $id !== null && $id !== ''
            ? 'https://drive.google.com/uc?export=download&id=' . rawurlencode($id)
            : null;
    }
}
