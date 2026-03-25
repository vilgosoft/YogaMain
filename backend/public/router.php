<?php

declare(strict_types=1);

// PHP built-in server: route all non-file requests to the API front controller.
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

if ($uri !== '/' && $uri !== '') {
    $file = __DIR__ . $uri;
    if (is_file($file)) {
        return false;
    }
}

require __DIR__ . '/index.php';
