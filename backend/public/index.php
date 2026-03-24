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
// Admin Routes (added in Phase 3)
// =============================================
// $adminUserController = new App\Controllers\AdminUserController();
// $router->get('/admin/users', [$adminUserController, 'index'], [AuthMiddleware::class, AdminMiddleware::class]);

// =============================================
// Public Course Routes (added in Phase 4)
// =============================================
// $courseController = new App\Controllers\CourseController();
// $router->get('/courses', [$courseController, 'index']);

// =============================================
// Payment Routes (added in Phase 4)
// =============================================
// $paymentController = new App\Controllers\PaymentController();
// $router->post('/payments/phonepe-init', [$paymentController, 'initiate'], [AuthMiddleware::class]);

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
