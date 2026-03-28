-- Password reset tokens (forgot-password flow). Run once on existing databases.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED     NOT NULL,
    token_hash   CHAR(64)         NOT NULL,
    expires_at   DATETIME         NOT NULL,
    created_at   TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_token_hash (token_hash),
    KEY idx_prt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
