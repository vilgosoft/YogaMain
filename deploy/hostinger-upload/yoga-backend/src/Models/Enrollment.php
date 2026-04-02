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

    /**
     * @param int[] $courseIds
     * @return int[] course IDs the user is enrolled in
     */
    public function getEnrolledCourseIds(int $userId, array $courseIds): array
    {
        $courseIds = array_values(array_unique(array_filter(array_map('intval', $courseIds))));
        if ($courseIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($courseIds), '?'));
        $sql          = "SELECT course_id FROM enrollments WHERE user_id = ? AND course_id IN ({$placeholders})";
        $stmt         = $this->db->prepare($sql);
        $stmt->execute(array_merge([$userId], $courseIds));

        return array_map('intval', array_column($stmt->fetchAll(), 'course_id'));
    }

    public function create(int $userId, int $courseId): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO enrollments (user_id, course_id) VALUES (:user_id, :course_id)'
        );
        $stmt->execute(['user_id' => $userId, 'course_id' => $courseId]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Idempotent insert — safe for concurrent free-enroll / payment callback retries
     * (unique user_id + course_id).
     */
    public function ensureEnrolled(int $userId, int $courseId): void
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (:user_id, :course_id)'
        );
        $stmt->execute(['user_id' => $userId, 'course_id' => $courseId]);
    }

    /**
     * Drop access and clear watch progress for that course (admin unenroll).
     */
    public function removeEnrollment(int $userId, int $courseId): void
    {
        $del = $this->db->prepare(
            'DELETE vp FROM video_progress vp
             INNER JOIN videos v ON v.id = vp.video_id
             WHERE vp.user_id = :uid AND v.course_id = :cid'
        );
        $del->execute(['uid' => $userId, 'cid' => $courseId]);

        $stmt = $this->db->prepare(
            'DELETE FROM enrollments WHERE user_id = :uid AND course_id = :cid'
        );
        $stmt->execute(['uid' => $userId, 'cid' => $courseId]);
    }

    /**
     * Replace the user's enrollments with exactly $desiredCourseIds (validated course IDs).
     */
    public function syncUserEnrollments(int $userId, array $desiredCourseIds): void
    {
        $desiredCourseIds = array_values(array_unique(array_filter(
            array_map(static fn ($id) => (int) $id, $desiredCourseIds),
            static fn (int $id) => $id > 0
        )));
        sort($desiredCourseIds);

        $stmt = $this->db->prepare('SELECT course_id FROM enrollments WHERE user_id = :uid');
        $stmt->execute(['uid' => $userId]);
        $current = array_map('intval', array_column($stmt->fetchAll(), 'course_id'));

        $toRemove = array_diff($current, $desiredCourseIds);
        $toAdd = array_diff($desiredCourseIds, $current);

        $this->db->beginTransaction();
        try {
            foreach ($toRemove as $cid) {
                $this->removeEnrollment($userId, (int) $cid);
            }
            foreach ($toAdd as $cid) {
                $this->ensureEnrolled($userId, (int) $cid);
            }
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getByUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT e.*, c.title, c.slug, c.thumbnail_url, c.short_desc, c.difficulty, c.duration_hours,
                    c.is_free, cat.name as category_name,
                    (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) as total_videos,
                    (SELECT COUNT(*) FROM video_progress vp WHERE vp.user_id = :uid2 AND vp.video_id IN (SELECT v2.id FROM videos v2 WHERE v2.course_id = c.id) AND vp.is_completed = 1) as completed_videos,
                    (SELECT v3.id FROM videos v3 WHERE v3.course_id = c.id ORDER BY v3.sort_order ASC, v3.id ASC LIMIT 1) as first_video_id
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             LEFT JOIN categories cat ON c.category_id = cat.id
             WHERE e.user_id = :user_id
             ORDER BY e.enrolled_at DESC'
        );
        $stmt->execute(['user_id' => $userId, 'uid2' => $userId]);
        return $stmt->fetchAll();
    }

    /**
     * Course % = average per lesson: 100 only when marked complete, 0 otherwise (no partial-watch bar).
     */
    public function updateProgress(int $userId, int $courseId): void
    {
        $stmt = $this->db->prepare(
            'SELECT v.id, v.duration_sec,
                    COALESCE(vp.watched_sec, 0) AS watched_sec,
                    COALESCE(vp.is_completed, 0) AS is_completed
             FROM videos v
             LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = :uid
             WHERE v.course_id = :cid
             ORDER BY v.sort_order ASC, v.id ASC'
        );
        $stmt->execute(['uid' => $userId, 'cid' => $courseId]);
        $rows = $stmt->fetchAll();

        if ($rows === []) {
            $u = $this->db->prepare('UPDATE enrollments SET progress_pct = 0 WHERE user_id = :uid AND course_id = :cid');
            $u->execute(['uid' => $userId, 'cid' => $courseId]);

            return;
        }

        $sum = 0;
        foreach ($rows as $r) {
            $dur  = $r['duration_sec'] !== null ? (int) $r['duration_sec'] : 0;
            $w    = (int) $r['watched_sec'];
            $done = (int) $r['is_completed'] === 1;

            $sum += $done ? 100 : 0;
        }

        $pct = (int) round($sum / count($rows));
        $pct = min(100, max(0, $pct));

        $stmt = $this->db->prepare('UPDATE enrollments SET progress_pct = :pct WHERE user_id = :uid AND course_id = :cid');
        $stmt->execute(['pct' => $pct, 'uid' => $userId, 'cid' => $courseId]);
    }

    public function getProgressPct(int $userId, int $courseId): int
    {
        $stmt = $this->db->prepare(
            'SELECT progress_pct FROM enrollments WHERE user_id = :uid AND course_id = :cid LIMIT 1'
        );
        $stmt->execute(['uid' => $userId, 'cid' => $courseId]);
        $row = $stmt->fetch();

        return $row ? (int) $row['progress_pct'] : 0;
    }
}
