<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

class JwtService
{
    private string $secret;
    private int $accessTtl;
    private int $refreshTtl;

    public function __construct()
    {
        $this->secret     = $_ENV['JWT_SECRET'] ?? '';
        $this->accessTtl  = (int) ($_ENV['JWT_ACCESS_TTL'] ?? 3600);
        $this->refreshTtl = (int) ($_ENV['JWT_REFRESH_TTL'] ?? 2592000);
    }

    public function createAccessToken(array $user): string
    {
        $now = time();
        $payload = [
            'sub'   => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'iat'   => $now,
            'exp'   => $now + $this->accessTtl,
        ];

        return JWT::encode($payload, $this->secret, 'HS256');
    }

    public function createRefreshToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public function getRefreshTtl(): int
    {
        return $this->refreshTtl;
    }

    public function decode(string $token): ?object
    {
        try {
            return JWT::decode($token, new Key($this->secret, 'HS256'));
        } catch (ExpiredException $e) {
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
