<?php

namespace App\Middleware;

use App\Helpers\Response;

class AdminMiddleware
{
    public function handle(): bool
    {
        // AuthMiddleware must run first
        $user = $GLOBALS['auth_user'] ?? null;

        if (!$user || $user['role'] !== 'admin') {
            Response::error('Admin access required', 'FORBIDDEN', 403);
            return false;
        }

        return true;
    }
}
