<?php

declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use PDO;

class VideoProgress
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * @return array{watched_sec: int, is_completed: int}|null
     */
    public function getForUserVideo(int $userId, int $videoId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT watched_sec, is_completed FROM video_progress WHERE user_id = :uid AND video_id = :vid LIMIT 1'
        );
        $stmt->execute(['uid' => $userId, 'vid' => $videoId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    /**
     * Mark watch position; auto-complete at >= 90% of duration when duration_sec known.
     */
    public function upsert(int $userId, int $videoId, int $watchedSec, bool $forceComplete, ?int $durationSec): void
    {
        $watchedSec = max(0, $watchedSec);
        $completed  = $forceComplete;

        if (!$completed && $durationSec !== null && $durationSec > 0) {
            if ($watchedSec >= (int) floor($durationSec * 0.9)) {
                $completed = true;
            }
        }

        $stmt = $this->db->prepare(
            'INSERT INTO video_progress (user_id, video_id, watched_sec, is_completed)
             VALUES (:uid, :vid, :ws, :ic)
             ON DUPLICATE KEY UPDATE
                watched_sec = GREATEST(watched_sec, VALUES(watched_sec)),
                is_completed = GREATEST(is_completed, VALUES(is_completed))'
        );
        $stmt->execute([
            'uid' => $userId,
            'vid' => $videoId,
            'ws'  => $watchedSec,
            'ic'  => $completed ? 1 : 0,
        ]);
    }
}
