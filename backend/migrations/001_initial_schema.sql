-- Sai ishani Yogashala Database Schema
-- Run this SQL against your MySQL database to create all tables

CREATE DATABASE IF NOT EXISTS yoga_lms
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE yoga_lms;

-- ============================================
-- Users
-- ============================================
CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    phone           VARCHAR(15)     NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            ENUM('user','admin') NOT NULL DEFAULT 'user',
    avatar_url      VARCHAR(500)    NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Categories (e.g., Beginner Yoga, Ashtanga, Meditation)
-- ============================================
CREATE TABLE categories (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    slug            VARCHAR(120)    NOT NULL UNIQUE,
    description     TEXT            NULL,
    sort_order      INT             NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Courses
-- ============================================
CREATE TABLE courses (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id     INT UNSIGNED    NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    slug            VARCHAR(280)    NOT NULL UNIQUE,
    description     TEXT            NULL,
    short_desc      VARCHAR(500)    NULL,
    thumbnail_url   VARCHAR(500)    NULL,
    price           DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    discount_price  DECIMAL(10,2)   NULL,
    difficulty      ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
    duration_hours  DECIMAL(5,1)    NULL,
    is_published    TINYINT(1)      NOT NULL DEFAULT 0,
    is_free         TINYINT(1)      NOT NULL DEFAULT 0,
    sort_order      INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_courses_category (category_id),
    INDEX idx_courses_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Videos
-- ============================================
CREATE TABLE videos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id       INT UNSIGNED    NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT            NULL,
    original_file   VARCHAR(500)    NOT NULL,
    hls_path        VARCHAR(500)    NULL,
    duration_sec    INT UNSIGNED    NULL,
    sort_order      INT             NOT NULL DEFAULT 0,
    is_preview      TINYINT(1)      NOT NULL DEFAULT 0,
    transcode_status ENUM('pending','processing','complete','failed') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_videos_course (course_id),
    INDEX idx_videos_sort (course_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Enrollments (User <-> Course)
-- ============================================
CREATE TABLE enrollments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL,
    course_id       INT UNSIGNED    NOT NULL,
    enrolled_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    last_video_id   INT UNSIGNED    NULL,
    progress_pct    TINYINT UNSIGNED NOT NULL DEFAULT 0,

    FOREIGN KEY (user_id)       REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (course_id)     REFERENCES courses(id)  ON DELETE CASCADE,
    FOREIGN KEY (last_video_id) REFERENCES videos(id)   ON DELETE SET NULL,
    UNIQUE KEY uq_enrollment (user_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Video Progress (watch tracking per user per video)
-- ============================================
CREATE TABLE video_progress (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL,
    video_id        INT UNSIGNED    NOT NULL,
    watched_sec     INT UNSIGNED    NOT NULL DEFAULT 0,
    is_completed    TINYINT(1)      NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id)  ON DELETE CASCADE,
    UNIQUE KEY uq_user_video (user_id, video_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Transactions (PhonePe payments)
-- ============================================
CREATE TABLE transactions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED    NOT NULL,
    course_id           INT UNSIGNED    NOT NULL,
    plan_code           VARCHAR(40)     NULL,
    merchant_txn_id     VARCHAR(100)    NOT NULL UNIQUE,
    phonepe_txn_id      VARCHAR(100)    NULL,
    amount              DECIMAL(10,2)   NOT NULL,
    status              ENUM('initiated','pending','success','failed','refunded') NOT NULL DEFAULT 'initiated',
    payment_method      VARCHAR(50)     NULL,
    phonepe_response    JSON            NULL,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE RESTRICT,
    FOREIGN KEY (course_id) REFERENCES courses(id)  ON DELETE RESTRICT,
    INDEX idx_txn_user (user_id),
    INDEX idx_txn_status (status),
    INDEX idx_txn_merchant (merchant_txn_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Refresh Tokens
-- ============================================
CREATE TABLE refresh_tokens (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL,
    token_hash      VARCHAR(255)    NOT NULL UNIQUE,
    expires_at      TIMESTAMP       NOT NULL,
    is_revoked      TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
