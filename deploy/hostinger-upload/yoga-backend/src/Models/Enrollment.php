<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class Enrollment
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function isEnrolled(int $userId, int $courseId): bool
    {
        $stmt = $this->db->prepare('SELECT id FROM enrollments WHERE user_id = :user_id AND course_id = :course_id LIMIT 1');
        $stmt->execute(['user_id' => $userId, 'course_id' => $courseId]);
        return (bool) $stmt->fetch();
    }

    public function create(int $userId, int $courseId): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO enrollments (user_id, course_id) VALUES (:user_id, :course_id)'
        );
        $stmt->execute(['user_id' => $userId, 'course_id' => $courseId]);
        return (int) $this->db->lastInsertId();
    }

    public function getByUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT e.*, c.title, c.slug, c.thumbnail_url, c.short_desc, c.difficulty, c.duration_hours,
                    c.is_free, cat.name as category_name,
                    (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) as total_videos,
                    (SELECT COUNT(*) FROM video_progress vp WHERE vp.user_id = :uid2 AND vp.video_id IN (SELECT v2.id FROM videos v2 WHERE v2.course_id = c.id) AND vp.is_completed = 1) as completed_videos
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             LEFT JOIN categories cat ON c.category_id = cat.id
             WHERE e.user_id = :user_id
             ORDER BY e.enrolled_at DESC'
        );
        $stmt->execute(['user_id' => $userId, 'uid2' => $userId]);
        return $stmt->fetchAll();
    }

    public function updateProgress(int $userId, int $courseId): void
    {
        // Calculate progress based on completed videos
        $stmt = $this->db->prepare(
            'SELECT
                (SELECT COUNT(*) FROM videos WHERE course_id = :cid) as total,
                (SELECT COUNT(*) FROM video_progress vp
                 JOIN videos v ON vp.video_id = v.id
                 WHERE vp.user_id = :uid AND v.course_id = :cid2 AND vp.is_completed = 1) as completed'
        );
        $stmt->execute(['cid' => $courseId, 'uid' => $userId, 'cid2' => $courseId]);
        $row = $stmt->fetch();

        $pct = $row['total'] > 0 ? (int) round(($row['completed'] / $row['total']) * 100) : 0;

        $stmt = $this->db->prepare('UPDATE enrollments SET progress_pct = :pct WHERE user_id = :uid AND course_id = :cid');
        $stmt->execute(['pct' => $pct, 'uid' => $userId, 'cid' => $courseId]);
    }
}
