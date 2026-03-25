<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            try {
                $socket = $_ENV['DB_SOCKET'] ?? '/var/run/mysqld/mysqld.sock';
                $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
                $port = $_ENV['DB_PORT'] ?? '3306';
                $dbname = $_ENV['DB_NAME'] ?? 'yoga_lms';

                // Prefer Unix socket for local connections (more reliable)
                if (($host === '127.0.0.1' || $host === 'localhost') && file_exists($socket)) {
                    $dsn = sprintf('mysql:unix_socket=%s;dbname=%s;charset=utf8mb4', $socket, $dbname);
                } else {
                    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $dbname);
                }

                self::$instance = new PDO($dsn, $_ENV['DB_USER'] ?? 'root', $_ENV['DB_PASS'] ?? '', [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES    => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND  => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                $errorMsg = 'Database connection failed';
                if (($_ENV['APP_ENV'] ?? 'production') === 'development') {
                    $errorMsg .= ': ' . $e->getMessage();
                    if (str_contains($e->getMessage(), 'refused') || str_contains($e->getMessage(), '2002')) {
                        $errorMsg .= '. Please ensure MySQL is running (start via XAMPP/WAMP or run: net start mysql)';
                    }
                }

                // Set CORS headers so browser can read the error
                $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
                if (preg_match('#^https?://localhost(:\d+)?$#', $origin)) {
                    header("Access-Control-Allow-Origin: {$origin}");
                    header('Access-Control-Allow-Credentials: true');
                }
                header('Content-Type: application/json');

                echo json_encode(['success' => false, 'error' => ['code' => 'DB_CONNECTION', 'message' => $errorMsg]]);
                exit;
            }
        }

        return self::$instance;
    }
}
