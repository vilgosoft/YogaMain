<?php

declare(strict_types=1);

// Load Composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Handle CORS
App\Config\Cors::handle();

// Serve static files from storage/ in local dev (on production, Apache serves uploads directly)
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/storage/(.+)$#', $requestUri, $storageMatch)) {
    $storagePath = realpath(__DIR__ . '/../storage');
    if ($storagePath) {
        $filePath = realpath($storagePath . '/' . $storageMatch[1]);
        if ($filePath && str_starts_with($filePath, $storagePath . DIRECTORY_SEPARATOR) && file_exists($filePath)) {
            $mime = mime_content_type($filePath) ?: 'application/octet-stream';
            $size = filesize($filePath);

            header('Content-Type: ' . $mime);
            header('Accept-Ranges: bytes');
            header('Cache-Control: public, max-age=86400');

            // Handle byte-range requests for video seeking
            if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d+)-(\d*)/', $_SERVER['HTTP_RANGE'], $rangeMatch)) {
                $start = (int) $rangeMatch[1];
                $end = !empty($rangeMatch[2]) ? (int) $rangeMatch[2] : $size - 1;
                if ($start < $size && $end < $size) {
                    http_response_code(206);
                    header("Content-Range: bytes $start-$end/$size");
                    header('Content-Length: ' . ($end - $start + 1));
                    $fp = fopen($filePath, 'rb');
                    fseek($fp, $start);
                    echo fread($fp, $end - $start + 1);
                    fclose($fp);
                    exit;
                }
            }

            header('Content-Length: ' . $size);
            readfile($filePath);
            exit;
        }
    }
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => ['message' => 'File not found', 'code' => 'NOT_FOUND']]);
    exit;
}

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
// Public Course Routes (Phase 4)
// =============================================
$courseController = new App\Controllers\CourseController();
$router->get('/courses/featured', [$courseController, 'featured']);
$router->get('/stats/landing',     [$courseController, 'landingStats']);
$router->get('/courses',          [$courseController, 'index']);
$router->get('/categories',       [$courseController, 'categories']);
$router->get('/courses/:slug',    [$courseController, 'show']);

// Video access (enrolled users)
$router->get('/videos/:id',      [$courseController, 'getVideo']);
$router->post('/videos/:id/progress', [$courseController, 'saveVideoProgress'], [AuthMiddleware::class]);

// Player page: full curriculum + progress
$router->get('/player/course/:courseId', [$courseController, 'playerCurriculum'], [AuthMiddleware::class]);

// Health endpoint
$router->get('/health', function () {
    App\Helpers\Response::json(['status' => 'ok']);
});

// =============================================
// User Dashboard (Phase 4)
// =============================================
$userDashboardController = new App\Controllers\UserDashboardController();
$router->get('/my-learning', [$userDashboardController, 'myLearning'], [AuthMiddleware::class]);

// =============================================
// Payment Routes (Phase 4)
// =============================================
$paymentController = new App\Controllers\PaymentController();
$router->post('/payments/phonepe-init',          [$paymentController, 'initiate'], [AuthMiddleware::class]);
$router->post('/payments/phonepe-callback',      [$paymentController, 'callback']);
$router->get('/payments/status/:merchant_txn_id', [$paymentController, 'status'],  [AuthMiddleware::class]);

// =============================================
// Video Routes (added in Phase 5)
// =============================================
// $videoController = new App\Controllers\VideoController();
// $router->get('/videos/:id/stream', [$videoController, 'stream'], [AuthMiddleware::class]);

// Dispatch the request
try {
    $router->dispatch();
} catch (\Throwable $e) {
    $isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
    App\Helpers\Response::error(
        $isDev ? $e->getMessage() : 'Internal server error',
        'SERVER_ERROR',
        500
    );
}
