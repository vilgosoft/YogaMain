<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class RefreshToken
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(int $userId, string $tokenHash, int $ttl): void
    {
        $expiresAt = date('Y-m-d H:i:s', time() + $ttl);

        $stmt = $this->db->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)'
        );

        $stmt->execute([
            'user_id'    => $userId,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
        ]);
    }

    public function findValidByHash(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM refresh_tokens WHERE token_hash = :hash AND is_revoked = 0 AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['hash' => $tokenHash]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function revoke(string $tokenHash): void
    {
        $stmt = $this->db->prepare('UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = :hash');
        $stmt->execute(['hash' => $tokenHash]);
    }

    public function revokeAllForUser(int $userId): void
    {
        $stmt = $this->db->prepare('UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);
    }
}
