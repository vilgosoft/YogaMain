<?php

declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use PDO;

class PasswordResetToken
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function deleteForUser(int $userId): void
    {
        $stmt = $this->db->prepare('DELETE FROM password_reset_tokens WHERE user_id = :uid');
        $stmt->execute(['uid' => $userId]);
    }

    public function create(int $userId, string $tokenHash, string $expiresAt): void
    {
        $this->deleteForUser($userId);
        $stmt = $this->db->prepare(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:uid, :th, :ex)'
        );
        $stmt->execute(['uid' => $userId, 'th' => $tokenHash, 'ex' => $expiresAt]);
    }

    /**
     * @return array{user_id: int}|null
     */
    public function findValidByTokenHash(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT user_id FROM password_reset_tokens WHERE token_hash = :h AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['h' => $tokenHash]);
        $row = $stmt->fetch();

        return $row ? ['user_id' => (int) $row['user_id']] : null;
    }

    public function deleteByTokenHash(string $tokenHash): void
    {
        $stmt = $this->db->prepare('DELETE FROM password_reset_tokens WHERE token_hash = :h');
        $stmt->execute(['h' => $tokenHash]);
    }
}
