<?php

namespace App\Config;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $instance = null;

    /**
     * @throws RuntimeException when the database connection fails
     */
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
                $errorMsg = 'Database connection failed';
                if (($host === '127.0.0.1' || $host === 'localhost') &&
                    (str_contains($e->getMessage(), 'refused') || str_contains($e->getMessage(), '2002'))) {
                    $errorMsg = 'MySQL is not running. Please start MySQL first (open XAMPP Control Panel and click Start next to MySQL)';
                }
                throw new RuntimeException($errorMsg, 0, $e);
            }
        }

        return self::$instance;
    }
}
