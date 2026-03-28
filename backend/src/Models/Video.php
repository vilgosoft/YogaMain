<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class Video
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getByCourseId(int $courseId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM videos WHERE course_id = :course_id ORDER BY sort_order ASC, id ASC'
        );
        $stmt->execute(['course_id' => $courseId]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM videos WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO videos (course_id, title, description, original_file, duration_sec, sort_order, is_preview, transcode_status)
             VALUES (:course_id, :title, :description, :original_file, :duration_sec, :sort_order, :is_preview, :transcode_status)'
        );
        $stmt->execute([
            'course_id'        => $data['course_id'],
            'title'            => $data['title'],
            'description'      => $data['description'] ?? null,
            'original_file'    => $data['original_file'],
            'duration_sec'     => $data['duration_sec'] ?? null,
            'sort_order'       => $data['sort_order'] ?? 0,
            'is_preview'       => $data['is_preview'] ?? 0,
            'transcode_status' => $data['transcode_status'] ?? 'pending',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $allowed = ['title', 'description', 'sort_order', 'is_preview', 'hls_path', 'duration_sec', 'transcode_status', 'original_file'];
        $fields = [];
        $params = ['id' => $id];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) return;

        $stmt = $this->db->prepare('UPDATE videos SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($params);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM videos WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    public function getNextSortOrder(int $courseId): int
    {
        $stmt = $this->db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM videos WHERE course_id = :course_id');
        $stmt->execute(['course_id' => $courseId]);
        return (int) $stmt->fetchColumn();
    }
}
