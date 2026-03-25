<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class Course
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

        if (!empty($filters['published_only'])) {
            $where[] = 'c.is_published = 1';
        }

        if (!empty($filters['category_id'])) {
            $where[] = 'c.category_id = :category_id';
            $params['category_id'] = $filters['category_id'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(c.title LIKE :search OR c.short_desc LIKE :search2)';
            $params['search'] = "%{$filters['search']}%";
            $params['search2'] = "%{$filters['search']}%";
        }

        $whereStr = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM courses c {$whereStr}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT c.*, cat.name as category_name,
                (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) as video_count
                FROM courses c
                LEFT JOIN categories cat ON c.category_id = cat.id
                {$whereStr}
                ORDER BY c.sort_order ASC, c.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue('limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'courses' => $stmt->fetchAll(),
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
            ],
        ];
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT c.*, cat.name as category_name,
             (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) as video_count
             FROM courses c
             LEFT JOIN categories cat ON c.category_id = cat.id
             WHERE c.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT c.*, cat.name as category_name,
             (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) as video_count
             FROM courses c
             LEFT JOIN categories cat ON c.category_id = cat.id
             WHERE c.slug = :slug LIMIT 1'
        );
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO courses (category_id, title, slug, description, short_desc, thumbnail_url, price, discount_price, difficulty, duration_hours, is_published, is_free, sort_order)
             VALUES (:category_id, :title, :slug, :description, :short_desc, :thumbnail_url, :price, :discount_price, :difficulty, :duration_hours, :is_published, :is_free, :sort_order)'
        );
        $stmt->execute([
            'category_id'    => $data['category_id'],
            'title'          => $data['title'],
            'slug'           => $data['slug'],
            'description'    => $data['description'] ?? null,
            'short_desc'     => $data['short_desc'] ?? null,
            'thumbnail_url'  => $data['thumbnail_url'] ?? null,
            'price'          => $data['price'] ?? 0,
            'discount_price' => $data['discount_price'] ?? null,
            'difficulty'     => $data['difficulty'] ?? 'beginner',
            'duration_hours' => $data['duration_hours'] ?? null,
            'is_published'   => $data['is_published'] ?? 0,
            'is_free'        => $data['is_free'] ?? 0,
            'sort_order'     => $data['sort_order'] ?? 0,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $allowed = ['category_id', 'title', 'slug', 'description', 'short_desc', 'thumbnail_url', 'price', 'discount_price', 'difficulty', 'duration_hours', 'is_published', 'is_free', 'sort_order'];
        $fields = [];
        $params = ['id' => $id];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) return;

        $stmt = $this->db->prepare('UPDATE courses SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($params);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM courses WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    public function getStats(): array
    {
        $stats = [];

        $stmt = $this->db->query('SELECT COUNT(*) FROM users WHERE role = "user"');
        $stats['total_users'] = (int) $stmt->fetchColumn();

        $stmt = $this->db->query('SELECT COUNT(*) FROM courses WHERE is_published = 1');
        $stats['total_courses'] = (int) $stmt->fetchColumn();

        $stmt = $this->db->query('SELECT COUNT(*) FROM enrollments');
        $stats['total_enrollments'] = (int) $stmt->fetchColumn();

        $stmt = $this->db->query('SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = "success"');
        $stats['total_revenue'] = (float) $stmt->fetchColumn();

        $stmt = $this->db->query('SELECT COUNT(*) FROM videos');
        $stats['total_videos'] = (int) $stmt->fetchColumn();

        return $stats;
    }

    /** Public counts for marketing / home page (no auth). */
    public function getLandingStats(): array
    {
        $stmt = $this->db->query('SELECT COUNT(*) FROM users WHERE role = "user"');
        $totalUsers = (int) $stmt->fetchColumn();

        $stmt = $this->db->query('SELECT COUNT(*) FROM courses WHERE is_published = 1');
        $totalCourses = (int) $stmt->fetchColumn();

        $stmt = $this->db->query('SELECT COUNT(*) FROM videos');
        $totalVideos = (int) $stmt->fetchColumn();

        $stmt = $this->db->query('SELECT COALESCE(SUM(duration_sec), 0) FROM videos');
        $totalSec = (int) $stmt->fetchColumn();
        $totalHours = (int) round($totalSec / 3600);

        return [
            'total_users'          => $totalUsers,
            'total_courses'        => $totalCourses,
            'total_videos'         => $totalVideos,
            'total_content_hours'  => $totalHours,
        ];
    }
}
