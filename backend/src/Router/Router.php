<?php

namespace App\Router;

use App\Helpers\Response;

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable $handler, array $middleware = []): self
    {
        $this->routes[] = [
            'method'     => strtoupper($method),
            'path'       => $path,
            'handler'    => $handler,
            'middleware'  => $middleware,
        ];
        return $this;
    }

    public function get(string $path, callable $handler, array $middleware = []): self
    {
        return $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable $handler, array $middleware = []): self
    {
        return $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable $handler, array $middleware = []): self
    {
        return $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, callable $handler, array $middleware = []): self
    {
        return $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, callable $handler, array $middleware = []): self
    {
        return $this->add('DELETE', $path, $handler, $middleware);
    }

    public function dispatch(): void
    {
        $requestMethod = $_SERVER['REQUEST_METHOD'];
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Strip /api prefix if present
        $requestUri = preg_replace('#^/api#', '', $requestUri);

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
