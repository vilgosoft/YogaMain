<?php

namespace App\Config;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            try {
                $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
                $port = $_ENV['DB_PORT'] ?? '3306';
                $dbname = $_ENV['DB_NAME'] ?? 'yoga_lms';
                $socket = $_ENV['DB_SOCKET'] ?? '';

                // Use Unix socket only if explicitly set or found at default path in dev
                if ($socket && file_exists($socket)) {
                    $dsn = sprintf('mysql:unix_socket=%s;dbname=%s;charset=utf8mb4', $socket, $dbname);
                } elseif (!$socket && ($host === '127.0.0.1' || $host === 'localhost') && file_exists('/var/run/mysqld/mysqld.sock')) {
                    $dsn = sprintf('mysql:unix_socket=/var/run/mysqld/mysqld.sock;dbname=%s;charset=utf8mb4', $dbname);
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
                $errorMsg = 'Database connection failed';
                $isLocal = ($host === '127.0.0.1' || $host === 'localhost');
                if ($isLocal && (str_contains($e->getMessage(), 'refused') || str_contains($e->getMessage(), '2002'))) {
                    $isProduction = ($_ENV['APP_ENV'] ?? 'development') === 'production';
                    $errorMsg = $isProduction
                        ? 'Database connection failed. Please check DB credentials in .env'
                        : 'MySQL is not running. Please start MySQL first (open XAMPP Control Panel and click Start next to MySQL)';
                }
                throw new RuntimeException($errorMsg, 0, $e);
            }
        }

        return self::$instance;
    }
}
