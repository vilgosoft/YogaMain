<?php

namespace App\Config;

class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // In production, frontend and API are on the same domain — no CORS needed.
        // In development, allow localhost origins.
        $frontendUrl = $_ENV['FRONTEND_URL'] ?? '';
        $allowedOrigins = array_filter([
            $frontendUrl,
            'http://localhost:5173',
            'http://localhost:3000',
        ]);

        if (in_array($origin, $allowedOrigins, true) || preg_match('#^https?://localhost(:\d+)?$#', $origin)) {
            header("Access-Control-Allow-Origin: {$origin}");
        } elseif ($frontendUrl) {
            header("Access-Control-Allow-Origin: {$frontendUrl}");
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
