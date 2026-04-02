<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class Transaction
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getPaginated(int $page = 1, int $perPage = 12, array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = 't.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['user_id'])) {
            $where[] = 't.user_id = :user_id';
            $params['user_id'] = $filters['user_id'];
        }

        $whereStr = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM transactions t {$whereStr}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT t.*, u.name as user_name, u.email as user_email, c.title as course_title
                FROM transactions t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN courses c ON t.course_id = c.id
                {$whereStr}
                ORDER BY t.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue('limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'transactions' => $stmt->fetchAll(),
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
            ],
        ];
    }

    public function deleteById(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM transactions WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
