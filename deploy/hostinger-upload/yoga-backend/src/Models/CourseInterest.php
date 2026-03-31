<?php

declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use PDO;

class CourseInterest
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** @return bool true if a new row was inserted */
    public function addIfNew(int $userId, int $courseId): bool
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO course_interests (user_id, course_id) VALUES (:uid, :cid)'
        );
        $stmt->execute(['uid' => $userId, 'cid' => $courseId]);

        return $stmt->rowCount() > 0;
    }
}
