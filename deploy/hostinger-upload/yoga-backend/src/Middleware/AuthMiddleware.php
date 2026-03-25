<?php

namespace App\Middleware;

use App\Services\JwtService;
use App\Helpers\Response;

class AuthMiddleware
{
    public function handle(): bool
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            Response::error('Authentication required', 'UNAUTHORIZED', 401);
            return false;
        }

        $token = $matches[1];
        $jwt = new JwtService();
        $decoded = $jwt->decode($token);

        if (!$decoded) {
            Response::error('Invalid or expired token', 'UNAUTHORIZED', 401);
            return false;
        }

        // Store decoded user info in a global for controllers to access
        $GLOBALS['auth_user'] = [
            'id'    => $decoded->sub,
            'email' => $decoded->email,
            'role'  => $decoded->role,
        ];

        return true;
    }
}
