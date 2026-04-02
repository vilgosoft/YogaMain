<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class User
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function findByEmail(string $email): ?array
    {
        $normalized = strtolower(trim($email));
        $stmt = $this->db->prepare(
            'SELECT * FROM users WHERE LOWER(TRIM(email)) = :email LIMIT 1'
        );
        $stmt->execute(['email' => $normalized]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT id, name, email, phone, role, avatar_url, is_active, created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function firstActiveAdminEmail(): ?string
    {
        $stmt = $this->db->query(
            "SELECT email FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id ASC LIMIT 1"
        );
        $row = $stmt->fetch();

        return $row ? (string) $row['email'] : null;
    }

    public function findByPhone(string $phone): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE phone = :phone LIMIT 1');
        $stmt->execute(['phone' => $phone]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function emailTakenByOtherUser(string $email, int $excludeUserId): bool
    {
        $normalized = strtolower(trim($email));
        $stmt = $this->db->prepare(
            'SELECT id FROM users WHERE LOWER(TRIM(email)) = :email AND id != :id LIMIT 1'
        );
        $stmt->execute(['email' => $normalized, 'id' => $excludeUserId]);

        return (bool) $stmt->fetch();
    }

    public function phoneTakenByOtherUser(string $phone, int $excludeUserId): bool
    {
        $stmt = $this->db->prepare(
            'SELECT id FROM users WHERE phone = :phone AND id != :id LIMIT 1'
        );
        $stmt->execute(['phone' => $phone, 'id' => $excludeUserId]);

        return (bool) $stmt->fetch();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, phone, password_hash, role) VALUES (:name, :email, :phone, :password_hash, :role)'
        );

        $stmt->execute([
            'name'          => $data['name'],
            'email'         => $data['email'],
            'phone'         => $data['phone'],
            'password_hash' => $data['password_hash'],
            'role'          => $data['role'] ?? 'user',
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function updatePasswordHash(int $id, string $passwordHash): void
    {
        $stmt = $this->db->prepare('UPDATE users SET password_hash = :h WHERE id = :id');
        $stmt->execute(['h' => $passwordHash, 'id' => $id]);
    }

    public function getPaginated(int $page = 1, int $perPage = 12, string $search = ''): array
    {
        $offset = ($page - 1) * $perPage;

        $where = '';
        $params = [];

        if ($search) {
            $where = 'WHERE name LIKE :search OR email LIKE :search2 OR phone LIKE :search3';
            $params['search']  = "%{$search}%";
            $params['search2'] = "%{$search}%";
            $params['search3'] = "%{$search}%";
        }

        // Count total
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Fetch page
        $stmt = $this->db->prepare(
            "SELECT id, name, email, phone, role, is_active, created_at FROM users {$where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue('limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'users' => $stmt->fetchAll(),
            'meta'  => [
                'page'      => $page,
                'per_page'  => $perPage,
                'total'     => $total,
                'last_page' => (int) ceil($total / $perPage),
            ],
        ];
    }

    /**
     * Permanently remove a user. Clears dependent rows that use ON DELETE RESTRICT on users.id.
     */
    public function deleteById(int $id): bool
    {
        $this->db->beginTransaction();
        try {
            $this->db->prepare('DELETE FROM transactions WHERE user_id = :uid')->execute(['uid' => $id]);
            $this->db->prepare('DELETE FROM password_reset_tokens WHERE user_id = :uid')->execute(['uid' => $id]);
            $stmt = $this->db->prepare('DELETE FROM users WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $ok = $stmt->rowCount() > 0;
            if ($ok) {
                $this->db->commit();
            } else {
                $this->db->rollBack();
            }

            return $ok;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
