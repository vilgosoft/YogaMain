<?php

declare(strict_types=1);

// Load Composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
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
$router->get('/courses',          [$courseController, 'index']);
$router->get('/categories',       [$courseController, 'categories']);
$router->get('/courses/:slug',    [$courseController, 'show']);

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

// Health check (no DB required)
$router->get('/health', function () {
    $status = ['api' => true, 'database' => false];
    try {
        \App\Config\Database::getConnection();
        $status['database'] = true;
    } catch (\Throwable $e) {
        // DB is down — capture but don't crash
    }
    $code = $status['database'] ? 200 : 503;
    http_response_code($code);
    echo json_encode(['success' => $status['database'], 'data' => $status]);
    exit;
});

// Dispatch the request
try {
    $router->dispatch();
} catch (\RuntimeException $e) {
    if (str_contains($e->getMessage(), 'MySQL is not running') || str_contains($e->getMessage(), 'Database connection failed')) {
        http_response_code(503);
        // Set CORS headers so the browser can read the error
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (preg_match('#^https?://localhost(:\d+)?$#', $origin)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
        }
        App\Helpers\Response::error($e->getMessage(), 'DB_CONNECTION', 503);
    } else {
        throw $e;
    }
} catch (\Throwable $e) {
    $isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
    App\Helpers\Response::error(
        $isDev ? $e->getMessage() : 'Internal server error',
        'SERVER_ERROR',
        500
    );
}
