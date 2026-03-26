<?php

namespace App\Router;

use App\Helpers\Response;

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler, array $middleware = []): self
    {
        $this->routes[] = [
            'method'     => strtoupper($method),
            'path'       => $path,
            'handler'    => $handler,
            'middleware'  => $middleware,
        ];
        return $this;
    }

    public function get(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('DELETE', $path, $handler, $middleware);
    }

    public function dispatch(): void
    {
        $requestMethod = $_SERVER['REQUEST_METHOD'];
        $requestUri = self::resolveRequestPath();

        // Remove trailing slash (except root)
        if ($requestUri !== '/') {
            $requestUri = rtrim($requestUri, '/');
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod) {
                continue;
            }

            $params = $this->matchRoute($route['path'], $requestUri);
            if ($params === false) {
                continue;
            }

            // Run middleware chain
            foreach ($route['middleware'] as $middleware) {
                $middlewareInstance = new $middleware();
                $result = $middlewareInstance->handle();
                if ($result === false) {
                    return;
                }
            }

            // Call handler with matched params
            call_user_func($route['handler'], $params);
            return;
        }

        Response::error('Route not found', 'NOT_FOUND', 404);
    }

    /**
     * Shared hosting (Apache/LiteSpeed) often rewrites /api/... to api/index.php and may
     * leave REQUEST_URI as /api/index.php. Prefer PATH_INFO when set, then REDIRECT_URL.
     */
    private static function resolveRequestPath(): string
    {
        $pathInfo = $_SERVER['PATH_INFO'] ?? '';
        if (is_string($pathInfo) && $pathInfo !== '' && $pathInfo !== '/') {
            $path = $pathInfo;
        } else {
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
            $path = preg_replace('#^/api#', '', $path);
        }

        if ($path === '/index.php' || $path === '') {
            foreach (['REDIRECT_URL', 'REDIRECT_URI'] as $key) {
                $redirect = parse_url($_SERVER[$key] ?? '', PHP_URL_PATH);
                if (is_string($redirect) && $redirect !== '' && $redirect !== '/') {
                    $path = preg_replace('#^/api#', '', $redirect);
                    break;
                }
            }
        }

        $path = preg_replace('#/index\.php$#', '', $path);

        if ($path !== '/' && $path !== '' && !str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        if ($path === '' || $path === '/') {
            return '/';
        }

        return $path;
    }

    private function matchRoute(string $routePath, string $requestUri): array|false
    {
        // Convert route params like :id to regex named groups
        $pattern = preg_replace('#:([a-zA-Z_]+)#', '(?P<$1>[^/]+)', $routePath);
        $pattern = '#^' . $pattern . '$#';

        if (preg_match($pattern, $requestUri, $matches)) {
            // Filter only named matches
            return array_filter($matches, fn($key) => !is_int($key), ARRAY_FILTER_USE_KEY);
        }

        return false;
    }
}
