<?php

/**
 * Quick DB check: loads .env and tries to connect + counts users table.
 * Run from backend folder: php scripts/check-database.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_ENV['DB_PORT'] ?? '3306';
$name = $_ENV['DB_NAME'] ?? 'yoga_lms';
$user = $_ENV['DB_USER'] ?? 'root';

echo "Trying MySQL at {$host}:{$port}, database `{$name}`, user `{$user}`...\n";

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $host,
        $port,
        $name
    );
    $pdo = new PDO(
        $dsn,
        $user,
        $_ENV['DB_PASS'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $n = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    echo "OK — connected. Users table has {$n} row(s).\n";
} catch (PDOException $e) {
    fwrite(STDERR, "FAILED: " . $e->getMessage() . "\n\n");
    fwrite(STDERR, "Fix:\n");
    fwrite(STDERR, "  1) Start MySQL (Services app, XAMPP Control Panel, etc.).\n");
    fwrite(STDERR, "  2) Create DB + tables: run migrations/001_initial_schema.sql (MySQL Workbench, HeidiSQL, or mysql CLI).\n");
    fwrite(STDERR, "  3) Set DB_USER / DB_PASS in backend/.env if root uses a password.\n");
    exit(1);
}
