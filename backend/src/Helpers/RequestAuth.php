<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Reads Authorization on Apache/LiteSpeed/PHP-FPM where HTTP_AUTHORIZATION may be unset.
 */
final class RequestAuth
{
    public static function bearerHeader(): string
    {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['HTTP_AUTHORIZATION'];
        }
        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (function_exists('apache_request_headers')) {
            foreach (apache_request_headers() as $key => $value) {
                if (strcasecmp((string) $key, 'Authorization') === 0) {
                    return (string) $value;
                }
            }
        }

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $key => $value) {
                    if (strcasecmp((string) $key, 'Authorization') === 0) {
                        return (string) $value;
                    }
                }
            }
        }

        return '';
    }
}
