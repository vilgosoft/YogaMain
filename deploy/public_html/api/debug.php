<?php
/**
 * DIAGNOSTIC FILE — Upload to public_html/api/debug.php
 * Visit: https://tpslchecklist.in/api/debug.php
 * DELETE THIS FILE after debugging!
 */

header('Content-Type: text/plain; charset=utf-8');
echo "=== Yoga LMS Deployment Diagnostics ===\n\n";

// 1. PHP Version
echo "1. PHP Version: " . PHP_VERSION . "\n";
if (version_compare(PHP_VERSION, '8.0.0', '<')) {
    echo "   ❌ PROBLEM: PHP 8.0+ required! Current version is too old.\n";
    echo "   FIX: Go to Hostinger hPanel > Advanced > PHP Configuration > Change to PHP 8.1 or 8.2\n\n";
} else {
    echo "   ✅ OK\n\n";
}

// 2. Required PHP extensions
echo "2. PHP Extensions:\n";
$required = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'openssl'];
foreach ($required as $ext) {
    if (extension_loaded($ext)) {
        echo "   ✅ $ext: loaded\n";
    } else {
        echo "   ❌ $ext: MISSING — enable in hPanel > PHP Configuration > Extensions\n";
    }
}
echo "\n";

// 3. Current file path
echo "3. File Paths:\n";
echo "   This file:    " . __FILE__ . "\n";
echo "   This dir:     " . __DIR__ . "\n";
echo "   public_html:  " . dirname(__DIR__) . "\n";
echo "   Home dir:     " . dirname(__DIR__, 2) . "\n\n";

// 4. Check backend directory
$backendDir = dirname(__DIR__, 2) . '/yoga-backend';
echo "4. Backend Directory: $backendDir\n";
if (is_dir($backendDir)) {
    echo "   ✅ Directory exists\n";

    // Check key files
    $files = [
        '/vendor/autoload.php' => 'Composer autoloader',
        '/.env'                => 'Environment config',
        '/src/Controllers/AuthController.php' => 'Auth controller',
        '/src/Config/Database.php' => 'Database config',
    ];
    foreach ($files as $file => $desc) {
        $fullPath = $backendDir . $file;
        if (file_exists($fullPath)) {
            echo "   ✅ $desc: found ($file)\n";
        } else {
            echo "   ❌ $desc: MISSING ($file)\n";
        }
    }
} else {
    echo "   ❌ PROBLEM: Directory NOT FOUND!\n";
    echo "   FIX: Create 'yoga-backend' folder at: " . dirname(__DIR__, 2) . "/\n";
    echo "\n   Checking what IS there...\n";
    $parentDir = dirname(__DIR__, 2);
    if (is_dir($parentDir)) {
        $items = scandir($parentDir);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $type = is_dir($parentDir . '/' . $item) ? '[DIR]' : '[FILE]';
            echo "   $type $item\n";
        }
    }
}
echo "\n";

// 5. Check .env file
echo "5. Environment (.env):\n";
$envFile = $backendDir . '/.env';
if (file_exists($envFile)) {
    $envContent = file_get_contents($envFile);
    $lines = explode("\n", $envContent);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === '#') continue;
        $parts = explode('=', $line, 2);
        $key = $parts[0] ?? '';
        $val = $parts[1] ?? '';
        // Mask sensitive values
        if (in_array($key, ['DB_PASS', 'JWT_SECRET', 'VIDEO_SIGNING_KEY', 'PHONEPE_SALT_KEY'])) {
            $val = str_repeat('*', min(strlen($val), 8));
        }
        echo "   $key = $val\n";
    }
} else {
    echo "   ❌ .env file not found at: $envFile\n";
    echo "   FIX: Rename .env.example to .env and fill in your DB credentials\n";
}
echo "\n";

// 6. Test database connection
echo "6. Database Connection:\n";
if (file_exists($envFile)) {
    // Parse .env manually
    $env = [];
    foreach (explode("\n", file_get_contents($envFile)) as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === '#') continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $env[trim($parts[0])] = trim($parts[1]);
        }
    }

    $host = $env['DB_HOST'] ?? 'localhost';
    $port = $env['DB_PORT'] ?? '3306';
    $name = $env['DB_NAME'] ?? '';
    $user = $env['DB_USER'] ?? '';
    $pass = $env['DB_PASS'] ?? '';

    echo "   Host: $host, Port: $port, DB: $name, User: $user\n";

    try {
        $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        echo "   ✅ Connected successfully!\n";

        // Check tables
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        echo "   Tables found: " . count($tables) . "\n";
        foreach ($tables as $table) {
            echo "   - $table\n";
        }
        if (empty($tables)) {
            echo "   ❌ No tables found! Import the SQL schema via phpMyAdmin.\n";
        }
    } catch (PDOException $e) {
        echo "   ❌ Connection FAILED: " . $e->getMessage() . "\n";
    }
} else {
    echo "   ⏭️ Skipped — no .env file\n";
}
echo "\n";

// 7. Check .htaccess
echo "7. .htaccess Files:\n";
$htFiles = [
    dirname(__DIR__) . '/.htaccess'  => 'public_html/.htaccess',
    __DIR__ . '/.htaccess'           => 'public_html/api/.htaccess',
];
foreach ($htFiles as $path => $label) {
    if (file_exists($path)) {
        echo "   ✅ $label exists (" . filesize($path) . " bytes)\n";
    } else {
        echo "   ❌ $label MISSING\n";
    }
}
echo "\n";

// 8. mod_rewrite
echo "8. Apache mod_rewrite: ";
if (function_exists('apache_get_modules')) {
    echo in_array('mod_rewrite', apache_get_modules()) ? "✅ enabled\n" : "❌ not enabled\n";
} else {
    echo "Cannot detect (CGI mode) — usually enabled on Hostinger\n";
}

// 9. Upload limits
echo "\n9. PHP Upload Limits:\n";
echo "   upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "   post_max_size:       " . ini_get('post_max_size') . "\n";
echo "   max_execution_time:  " . ini_get('max_execution_time') . "s\n";
echo "   memory_limit:        " . ini_get('memory_limit') . "\n";
$uploadMax = ini_get('upload_max_filesize');
$uploadBytes = (int) $uploadMax;
if (stripos($uploadMax, 'M') !== false) $uploadBytes = (int) $uploadMax * 1024 * 1024;
if ($uploadBytes < 100 * 1024 * 1024) {
    echo "   ⚠️ upload_max_filesize is low for video uploads. Upload .user.ini to public_html/\n";
}

// 10. Uploads directory
echo "\n10. Uploads Directory:\n";
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__);
$uploadsDir = $docRoot . '/uploads';
echo "   Document root:  $docRoot\n";
echo "   Uploads path:   $uploadsDir\n";
if (is_dir($uploadsDir)) {
    echo "   ✅ Directory exists\n";
    echo "   Writable: " . (is_writable($uploadsDir) ? "✅ yes" : "❌ NO — fix permissions to 755") . "\n";
    $subs = ['thumbnails', 'videos'];
    foreach ($subs as $sub) {
        $subPath = $uploadsDir . '/' . $sub;
        if (is_dir($subPath)) {
            echo "   ✅ $sub/ exists\n";
        } else {
            echo "   ⏳ $sub/ will be created on first upload\n";
        }
    }
} else {
    echo "   ❌ NOT FOUND — create 'uploads' folder inside public_html/\n";
}

// 11. Video files check
echo "\n11. Videos in Database:\n";
if (isset($pdo)) {
    try {
        $rows = $pdo->query("SELECT id, course_id, title, original_file FROM videos ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) {
            echo "   No videos in database\n";
        }
        foreach ($rows as $row) {
            echo "   Video #{$row['id']}: {$row['title']}\n";
            echo "     DB path:   {$row['original_file']}\n";
            // Check if file exists on disk
            $storedPath = $row['original_file'];
            if (str_starts_with($storedPath, '/uploads/')) {
                $diskPath = $docRoot . $storedPath;
                $exists = file_exists($diskPath);
                echo "     Disk path: $diskPath\n";
                echo "     Exists:    " . ($exists ? "✅ YES (" . round(filesize($diskPath)/1024/1024, 1) . " MB)" : "❌ NO — file missing!") . "\n";
                echo "     URL:       https://{$_SERVER['HTTP_HOST']}{$storedPath}\n";
            } elseif (str_starts_with($storedPath, './storage/') || str_starts_with($storedPath, '/api/storage/')) {
                echo "     ⚠️ OLD PATH FORMAT — this video was uploaded with old code\n";
                $filename = basename($storedPath);
                $newPath = $docRoot . '/uploads/videos/' . $filename;
                echo "     Check:     " . (file_exists($newPath) ? "✅ Found at new location" : "❌ NOT found at /uploads/videos/$filename") . "\n";
            } else {
                echo "     ⚠️ UNKNOWN PATH FORMAT\n";
            }
        }
    } catch (\Throwable $e) {
        echo "   Error: " . $e->getMessage() . "\n";
    }
} else {
    echo "   Skipped — no DB connection\n";
}

echo "\n=== END OF DIAGNOSTICS ===\n";
echo "\n⚠️ DELETE THIS FILE after debugging! It exposes server info.\n";
