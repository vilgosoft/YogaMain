<?php

namespace App\Config;

class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = array_filter(array_map('trim', [
            $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173',
            'http://localhost:5173',
            'http://localhost:3000',
        ]));

        // Allow the requesting origin if it matches allowed list or is a localhost origin
        if (in_array($origin, $allowedOrigins, true) || preg_match('#^https?://localhost(:\d+)?$#', $origin)) {
            header("Access-Control-Allow-Origin: {$origin}");
        } else {
            header('Access-Control-Allow-Origin: ' . ($allowedOrigins[0] ?? 'http://localhost:5173'));
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
