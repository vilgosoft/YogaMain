<?php

/**
 * Database Seeder
 * Run: php scripts/seed.php
 * Creates an admin user and sample categories.
 *
 * If admin login fails: php scripts/ensure-admin.php (resets password + role).
 */

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

use App\Config\Database;

$db = Database::getConnection();

echo "Seeding database...\n\n";

// =============================================
// Create Admin User
// =============================================
$adminEmail = 'admin@yogalms.com';
$stmt = $db->prepare('SELECT id FROM users WHERE email = :email');
$stmt->execute(['email' => $adminEmail]);

if (!$stmt->fetch()) {
    $stmt = $db->prepare(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (:name, :email, :phone, :password_hash, :role)'
    );
    $stmt->execute([
        'name'          => 'Admin',
        'email'         => $adminEmail,
        'phone'         => '9999999999',
        'password_hash' => password_hash('Admin@123', PASSWORD_BCRYPT, ['cost' => 12]),
        'role'          => 'admin',
    ]);
    echo "  Admin user created (admin@yogalms.com / Admin@123)\n";
} else {
    echo "  Admin user already exists, skipping.\n";
}

// =============================================
// Create Sample Categories
// =============================================
$categories = [
    ['name' => 'Beginner Yoga',   'slug' => 'beginner-yoga',   'description' => 'Perfect for those new to yoga, covering foundational poses and breathing techniques.', 'sort_order' => 1],
    ['name' => 'Ashtanga Yoga',   'slug' => 'ashtanga-yoga',   'description' => 'Dynamic and physically demanding style following a specific sequence of postures.', 'sort_order' => 2],
    ['name' => 'Hatha Yoga',      'slug' => 'hatha-yoga',      'description' => 'Classical yoga practice focusing on physical postures and breath control.', 'sort_order' => 3],
    ['name' => 'Meditation',      'slug' => 'meditation',      'description' => 'Guided meditation sessions for mindfulness, relaxation, and mental clarity.', 'sort_order' => 4],
    ['name' => 'Pranayama',       'slug' => 'pranayama',       'description' => 'Breathing techniques to enhance energy flow and promote well-being.', 'sort_order' => 5],
    ['name' => 'Power Yoga',      'slug' => 'power-yoga',      'description' => 'Fitness-based approach to vinyasa-style yoga with strength and flexibility focus.', 'sort_order' => 6],
];

$insertStmt = $db->prepare(
    'INSERT IGNORE INTO categories (name, slug, description, sort_order) VALUES (:name, :slug, :description, :sort_order)'
);

foreach ($categories as $cat) {
    $insertStmt->execute($cat);
}

echo "  Sample categories seeded (" . count($categories) . " categories)\n";

echo "\nDone!\n";
