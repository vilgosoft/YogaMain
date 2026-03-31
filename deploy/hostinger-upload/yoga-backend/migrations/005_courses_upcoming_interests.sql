-- Upcoming courses (home teaser) + user interest notifications
-- Run after 004_videos_captions_url.sql

ALTER TABLE courses
    ADD COLUMN is_upcoming TINYINT(1) NOT NULL DEFAULT 0 AFTER is_free,
    ADD INDEX idx_courses_upcoming (is_upcoming);

CREATE TABLE IF NOT EXISTS course_interests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_course_interest_user (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
