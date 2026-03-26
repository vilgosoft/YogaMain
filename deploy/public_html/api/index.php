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
$router->get('/stats/landing',     [$courseController, 'landingStats']);
$router->get('/courses',          [$courseController, 'index']);
$router->get('/categories',       [$courseController, 'categories']);
$router->get('/courses/:slug',    [$courseController, 'show']);

// Video access (enrolled users) — inline to avoid deploy sync issues
$router->get('/videos/:id', function (array $params) {
    $videoId = (int) $params['id'];
    $videoModel = new App\Models\Video();
    $video = $videoModel->findById($videoId);

    if (!$video) {
        App\Helpers\Response::error('Video not found', 'NOT_FOUND', 404);
    }

    // Preview videos are publicly accessible
    if ($video['is_preview']) {
        App\Helpers\Response::json([
            'video_url' => $video['original_file'],
            'title'     => $video['title'],
        ]);
        return;
    }

    // Non-preview videos require authentication + enrollment
    $authUser = $GLOBALS['auth_user'] ?? null;
    if (!$authUser) {
        // Try to parse JWT from Authorization header
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            $jwt = new App\Services\JwtService();
            $decoded = $jwt->decode($matches[1]);
            if ($decoded) {
                $authUser = ['id' => $decoded->sub, 'email' => $decoded->email, 'role' => $decoded->role];
            }
        }
    }

    if (!$authUser) {
        App\Helpers\Response::error('Authentication required', 'UNAUTHORIZED', 401);
    }

    $enrollmentModel = new App\Models\Enrollment();
    if (!$enrollmentModel->isEnrolled($authUser['id'], $video['course_id'])) {
        App\Helpers\Response::error('You must be enrolled in this course', 'FORBIDDEN', 403);
    }

    App\Helpers\Response::json([
        'video_url' => $video['original_file'],
        'title'     => $video['title'],
    ]);
});

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
