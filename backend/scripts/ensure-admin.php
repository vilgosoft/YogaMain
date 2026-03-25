<?php

/**
 * Ensures the default admin exists with a known bcrypt password (dev / recovery).
 * Run: php scripts/ensure-admin.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

use App\Config\Database;

$email = 'admin@yogalms.com';
$plainPassword = 'Admin@123';

$db = Database::getConnection();

$hash = password_hash($plainPassword, PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $db->prepare('SELECT id, email, role FROM users WHERE email = :email LIMIT 1');
$stmt->execute(['email' => $email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if ($row) {
    $upd = $db->prepare(
        'UPDATE users SET password_hash = :hash, role = :role, is_active = 1 WHERE id = :id'
    );
    $upd->execute([
        'hash' => $hash,
        'role' => 'admin',
        'id'   => (int) $row['id'],
    ]);
    echo "Updated admin user id={$row['id']}: password reset, role=admin, is_active=1\n";
    echo "Login: {$email} / {$plainPassword}\n";
    exit(0);
}

$ins = $db->prepare(
    'INSERT INTO users (name, email, phone, password_hash, role, is_active)
     VALUES (:name, :email, :phone, :password_hash, :role, 1)'
);
$ins->execute([
    'name'          => 'Admin',
    'email'         => $email,
    'phone'         => '9999999999',
    'password_hash' => $hash,
    'role'          => 'admin',
]);

echo "Created admin user.\n";
echo "Login: {$email} / {$plainPassword}\n";
