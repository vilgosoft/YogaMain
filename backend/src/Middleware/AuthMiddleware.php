<?php

namespace App\Middleware;

use App\Services\JwtService;
use App\Helpers\Response;
use App\Helpers\RequestAuth;

class AuthMiddleware
{
    public function handle(): bool
    {
        $authHeader = RequestAuth::bearerHeader();

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
            'id'    => (int) $decoded->sub,
            'email' => $decoded->email,
            'role'  => $decoded->role,
        ];

        return true;
    }
}
