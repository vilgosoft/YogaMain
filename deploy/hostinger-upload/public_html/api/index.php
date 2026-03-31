<?php

/**
 * Production API entry point for Hostinger shared hosting.
 *
 * This file lives in public_html/api/ and loads the backend
 * from outside the web root for security.
 */

declare(strict_types=1);

// Show errors during initial setup (remove after everything works)
ini_set('display_errors', '0');
error_reporting(E_ALL);
ini_set('log_errors', '1');

// Backend lives one level above public_html
// Hostinger structure: /home/username/public_html/api/index.php
//                      /home/username/yoga-backend/
$backendDir = dirname(__DIR__, 2) . '/yoga-backend';

// Verify backend directory exists — show helpful error if not
if (!is_dir($backendDir)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => [
            'message' => 'Backend not found at: ' . $backendDir . '. Make sure yoga-backend folder exists next to public_html.',
            'code' => 'BACKEND_NOT_FOUND',
        ],
    ]);
    exit;
}

// Verify autoloader exists
if (!file_exists($backendDir . '/vendor/autoload.php')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => [
            'message' => 'vendor/autoload.php not found. Make sure to upload the vendor/ folder inside yoga-backend/.',
            'code' => 'VENDOR_NOT_FOUND',
        ],
    ]);
    exit;
}

// Load Composer autoloader
require_once $backendDir . '/vendor/autoload.php';

// Load environment variables from backend directory
$dotenv = Dotenv\Dotenv::createImmutable($backendDir);
$dotenv->safeLoad();

// === EXPLICITLY SET UPLOAD PATHS FOR HOSTINGER ===
// public_html is one level up from this api/ directory
$publicHtml = dirname(__DIR__);  // /home/u602160284/domains/tpslchecklist.in/public_html
$_ENV['UPLOADS_PATH'] = $publicHtml . '/uploads';
$_ENV['UPLOADS_URL']  = '/uploads';

// Ensure uploads directories exist
$uploadDirs = [
    $publicHtml . '/uploads',
    $publicHtml . '/uploads/thumbnails',
    $publicHtml . '/uploads/videos',
];
foreach ($uploadDirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

// === AUTO-FIX FileUpload.php if it's the old version ===
// The old version saves to ./storage/videos/raw/ which is wrong.
// This writes the correct version so uploads go to public_html/uploads/
$fileUploadPath = $backendDir . '/src/Helpers/FileUpload.php';
$fileUploadContent = file_exists($fileUploadPath) ? file_get_contents($fileUploadPath) : '';
if (str_contains($fileUploadContent, 'videos/raw') || !str_contains($fileUploadContent, 'UPLOADS_PATH')) {
    $correctFileUpload = <<<'PHPCODE'
<?php

namespace App\Helpers;

class FileUpload
{
    private static array $imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private static array $videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];

    private static function getUploadsDir(): string
    {
        if (!empty($_ENV['UPLOADS_PATH'])) {
            return rtrim($_ENV['UPLOADS_PATH'], '/');
        }
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if ($docRoot && is_dir($docRoot . '/uploads')) {
            return $docRoot . '/uploads';
        }
        $domainRoot = dirname(dirname(__DIR__, 3));
        if (is_dir($domainRoot . '/public_html')) {
            $dir = $domainRoot . '/public_html/uploads';
            if (!is_dir($dir)) @mkdir($dir, 0755, true);
            return $dir;
        }
        return ($_ENV['STORAGE_PATH'] ?? './storage');
    }

    private static function getUrlPrefix(): string
    {
        if (!empty($_ENV['UPLOADS_URL'])) {
            return rtrim($_ENV['UPLOADS_URL'], '/');
        }
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if ($docRoot && is_dir($docRoot . '/uploads')) {
            return '/uploads';
        }
        $domainRoot = dirname(dirname(__DIR__, 3));
        if (is_dir($domainRoot . '/public_html')) {
            return '/uploads';
        }
        return '/api/storage';
    }

    public static function handleImage(array $file, string $subDir = 'thumbnails'): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error(self::getUploadErrorMessage($file['error']), 'UPLOAD_FAILED', 400);
            return null;
        }
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, self::$imageMimes, true)) {
            Response::error('Invalid image type. Allowed: JPG, PNG, WebP, GIF', 'INVALID_FILE', 400);
            return null;
        }
        if ($file['size'] > 5 * 1024 * 1024) {
            Response::error('Image must be under 5MB', 'FILE_TOO_LARGE', 400);
            return null;
        }
        $uploadsDir = self::getUploadsDir() . '/' . $subDir;
        if (!is_dir($uploadsDir)) {
            if (!@mkdir($uploadsDir, 0755, true)) {
                Response::error('Failed to create directory: ' . $uploadsDir, 'UPLOAD_FAILED', 500);
                return null;
            }
        }
        $ext = self::getExtension($mime);
        $filename = uniqid('img_', true) . '.' . $ext;
        $destination = $uploadsDir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Failed to save image to: ' . $destination, 'UPLOAD_FAILED', 500);
            return null;
        }
        return self::getUrlPrefix() . '/' . $subDir . '/' . $filename;
    }

    public static function handleVideo(array $file): ?string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error(self::getUploadErrorMessage($file['error']), 'UPLOAD_FAILED', 400);
            return null;
        }
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, self::$videoMimes, true)) {
            Response::error('Invalid video type. Allowed: MP4, MOV, AVI, WebM, MKV', 'INVALID_FILE', 400);
            return null;
        }
        if ($file['size'] > 500 * 1024 * 1024) {
            Response::error('Video must be under 500MB', 'FILE_TOO_LARGE', 400);
            return null;
        }
        $uploadsDir = self::getUploadsDir() . '/videos';
        if (!is_dir($uploadsDir)) {
            if (!@mkdir($uploadsDir, 0755, true)) {
                Response::error('Failed to create directory: ' . $uploadsDir, 'UPLOAD_FAILED', 500);
                return null;
            }
        }
        $ext = self::getExtension($mime);
        $filename = uniqid('vid_', true) . '.' . $ext;
        $destination = $uploadsDir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Failed to save video to: ' . $destination, 'UPLOAD_FAILED', 500);
            return null;
        }
        return self::getUrlPrefix() . '/videos/' . $filename;
    }

    private static function getExtension(string $mime): string
    {
        $map = [
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
            'video/mp4' => 'mp4', 'video/quicktime' => 'mov', 'video/x-msvideo' => 'avi',
            'video/webm' => 'webm', 'video/x-matroska' => 'mkv',
        ];
        return $map[$mime] ?? 'bin';
    }

    private static function getUploadErrorMessage(int $code): string
    {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server upload limit.',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit.',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory missing.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write to disk.',
            UPLOAD_ERR_EXTENSION => 'Upload blocked by PHP extension.',
        ];
        return $errors[$code] ?? 'Upload error code: ' . $code;
    }
}
PHPCODE;
    @file_put_contents($fileUploadPath, $correctFileUpload);
}

// Handle CORS
App\Config\Cors::handle();

// Set JSON content type
header('Content-Type: application/json');

// Initialize router
$router = new App\Router\Router();

// Import middleware classes
use App\Middleware\AuthMiddleware;
use App\Middleware\AdminMiddleware;

// =============================================
// Auth Routes
// =============================================
$authController = new App\Controllers\AuthController();

$router->post('/auth/register', [$authController, 'register']);
$router->post('/auth/login',    [$authController, 'login']);
$router->post('/auth/forgot-password', [$authController, 'forgotPassword']);
$router->post('/auth/reset-password',  [$authController, 'resetPassword']);
$router->post('/auth/refresh',  [$authController, 'refresh']);
$router->post('/auth/logout',   [$authController, 'logout'], [AuthMiddleware::class]);
$router->get('/auth/me',        [$authController, 'me'],     [AuthMiddleware::class]);

// =============================================
// Admin Routes
// =============================================
$adminMiddleware = [AuthMiddleware::class, AdminMiddleware::class];

// Dashboard Stats
$adminCourseController = new App\Controllers\AdminCourseController();
$router->get('/admin/dashboard/stats', [$adminCourseController, 'stats'], $adminMiddleware);

// Categories
$adminCategoryController = new App\Controllers\AdminCategoryController();
$router->get('/admin/categories',      [$adminCategoryController, 'index'],  $adminMiddleware);
$router->post('/admin/categories',     [$adminCategoryController, 'create'], $adminMiddleware);
$router->put('/admin/categories/:id',  [$adminCategoryController, 'update'], $adminMiddleware);
$router->delete('/admin/categories/:id', [$adminCategoryController, 'delete'], $adminMiddleware);

// Courses
$router->get('/admin/courses',         [$adminCourseController, 'index'],  $adminMiddleware);
$router->post('/admin/courses',        [$adminCourseController, 'create'], $adminMiddleware);
// POST (not PUT): PHP does not populate $_POST / $_FILES for multipart PUT requests.
$router->post('/admin/courses/:id/update', [$adminCourseController, 'update'], $adminMiddleware);
$router->put('/admin/courses/:id',     [$adminCourseController, 'update'], $adminMiddleware);
$router->delete('/admin/courses/:id',  [$adminCourseController, 'delete'], $adminMiddleware);

// Videos
$adminVideoController = new App\Controllers\AdminVideoController();
$router->get('/admin/videos/:courseId',  [$adminVideoController, 'index'],  $adminMiddleware);
$router->post('/admin/videos',           [$adminVideoController, 'create'], $adminMiddleware);
$router->put('/admin/videos/:id',        [$adminVideoController, 'update'], $adminMiddleware);
$router->delete('/admin/videos/:id',     [$adminVideoController, 'delete'], $adminMiddleware);

// Users
$adminUserController = new App\Controllers\AdminUserController();
$router->get('/admin/users',           [$adminUserController, 'index'],  $adminMiddleware);
$router->patch('/admin/users/:id',     [$adminUserController, 'update'], $adminMiddleware);

// Transactions
$adminTransactionController = new App\Controllers\AdminTransactionController();
$router->get('/admin/transactions',    [$adminTransactionController, 'index'], $adminMiddleware);

// =============================================
// Public Course Routes
// =============================================
$courseController = new App\Controllers\CourseController();
$router->get('/courses/featured', [$courseController, 'featured']);
$router->get('/courses/upcoming', [$courseController, 'upcoming']);
$router->get('/stats/landing',     [$courseController, 'landingStats']);
$router->get('/courses',          [$courseController, 'index']);
$router->get('/categories',       [$courseController, 'categories']);
$router->post('/courses/interest', [$courseController, 'expressInterest'], [AuthMiddleware::class]);
$router->get('/courses/:slug',    [$courseController, 'show']);

$router->get('/videos/:id', [$courseController, 'getVideo']);

$router->post('/videos/:id/progress', [$courseController, 'saveVideoProgress'], [AuthMiddleware::class]);
$router->get('/player/course/:courseId', [$courseController, 'playerCurriculum'], [AuthMiddleware::class]);

// =============================================
// User Dashboard
// =============================================
$userDashboardController = new App\Controllers\UserDashboardController();
$router->get('/my-learning', [$userDashboardController, 'myLearning'], [AuthMiddleware::class]);

// =============================================
// Payment Routes
// =============================================
$paymentController = new App\Controllers\PaymentController();
$router->post('/payments/phonepe-init',          [$paymentController, 'initiate'], [AuthMiddleware::class]);
$router->post('/payments/phonepe-callback',      [$paymentController, 'callback']);
$router->get('/payments/status/:merchant_txn_id', [$paymentController, 'status'],  [AuthMiddleware::class]);

// Dispatch
try {
    $router->dispatch();
} catch (\Throwable $e) {
    http_response_code(500);
    // Always show error message in API response so frontend can display it
    echo json_encode([
        'success' => false,
        'error' => [
            'message' => $e->getMessage(),
            'code' => 'SERVER_ERROR',
        ],
    ]);
}
