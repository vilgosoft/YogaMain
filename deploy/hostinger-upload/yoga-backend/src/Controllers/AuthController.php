<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\User;
use App\Models\RefreshToken;
use App\Services\JwtService;
use App\Services\ValidationService;

class AuthController
{
    private User $userModel;
    private RefreshToken $refreshTokenModel;
    private JwtService $jwt;
    private ValidationService $validator;

    public function __construct()
    {
        $this->userModel         = new User();
        $this->refreshTokenModel = new RefreshToken();
        $this->jwt               = new JwtService();
        $this->validator         = new ValidationService();
    }

    public function register(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $valid = $this->validator->validate($data, [
            'name'     => ['required', ['min', 2], ['max', 100]],
            'email'    => ['required', 'email'],
            'phone'    => ['required', 'phone'],
            'password' => ['required', ['min', 8]],
        ]);

        if (!$valid) {
            Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
        }

        // Check if email exists
        if ($this->userModel->findByEmail($data['email'])) {
            Response::error('Email already registered', 'VALIDATION_ERROR', 409, ['email' => 'This email is already in use']);
        }

        // Check if phone exists
        if ($this->userModel->findByPhone($data['phone'])) {
            Response::error('Phone number already registered', 'VALIDATION_ERROR', 409, ['phone' => 'This phone number is already in use']);
        }

        $userId = $this->userModel->create([
            'name'          => htmlspecialchars($data['name'], ENT_QUOTES, 'UTF-8'),
            'email'         => strtolower(trim($data['email'])),
            'phone'         => trim($data['phone']),
            'password_hash' => password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]),
        ]);

        $user = $this->userModel->findById($userId);

        // Generate tokens
        $accessToken  = $this->jwt->createAccessToken($user);
        $refreshToken = $this->jwt->createRefreshToken();

        // Store refresh token hash
        $this->refreshTokenModel->create(
            $userId,
            hash('sha256', $refreshToken),
            $this->jwt->getRefreshTtl()
        );

        // Set refresh token as HttpOnly cookie
        $this->setRefreshCookie($refreshToken);

        Response::json([
            'user'         => $user,
            'access_token' => $accessToken,
        ], 'Registration successful', 201);
    }

    public function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $valid = $this->validator->validate($data, [
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (!$valid) {
            Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
        }

        $user = $this->userModel->findByEmail(strtolower(trim($data['email'])));

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid email or password', 'AUTH_FAILED', 401);
        }

        if (!$user['is_active']) {
            Response::error('Account has been deactivated', 'ACCOUNT_DISABLED', 403);
        }

        $accessToken  = $this->jwt->createAccessToken($user);
        $refreshToken = $this->jwt->createRefreshToken();

        $this->refreshTokenModel->create(
            $user['id'],
            hash('sha256', $refreshToken),
            $this->jwt->getRefreshTtl()
        );

        $this->setRefreshCookie($refreshToken);

        // Remove password_hash from response
        unset($user['password_hash']);

        Response::json([
            'user'         => $user,
            'access_token' => $accessToken,
        ], 'Login successful');
    }

    public function refresh(): void
    {
        $refreshToken = $_COOKIE['refresh_token'] ?? null;

        if (!$refreshToken) {
            Response::error('Refresh token required', 'UNAUTHORIZED', 401);
        }

        $tokenHash = hash('sha256', $refreshToken);
        $storedToken = $this->refreshTokenModel->findValidByHash($tokenHash);

        if (!$storedToken) {
            Response::error('Invalid or expired refresh token', 'UNAUTHORIZED', 401);
        }

        // Revoke old token (rotation)
        $this->refreshTokenModel->revoke($tokenHash);

        $user = $this->userModel->findById($storedToken['user_id']);

        if (!$user || !$user['is_active']) {
            Response::error('Account not found or disabled', 'UNAUTHORIZED', 401);
        }

        // Issue new pair
        $newAccessToken  = $this->jwt->createAccessToken($user);
        $newRefreshToken = $this->jwt->createRefreshToken();

        $this->refreshTokenModel->create(
            $user['id'],
            hash('sha256', $newRefreshToken),
            $this->jwt->getRefreshTtl()
        );

        $this->setRefreshCookie($newRefreshToken);

        Response::json([
            'user'         => $user,
            'access_token' => $newAccessToken,
        ], 'Token refreshed');
    }

    public function logout(): void
    {
        $refreshToken = $_COOKIE['refresh_token'] ?? null;

        if ($refreshToken) {
            $this->refreshTokenModel->revoke(hash('sha256', $refreshToken));
        }

        // Clear the cookie
        setcookie('refresh_token', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'httponly'  => true,
            'samesite' => 'Lax',
            'secure'   => isset($_SERVER['HTTPS']),
        ]);

        Response::json(null, 'Logged out successfully');
    }

    public function me(): void
    {
        $authUser = $GLOBALS['auth_user'] ?? null;

        if (!$authUser) {
            Response::error('Not authenticated', 'UNAUTHORIZED', 401);
        }

        $user = $this->userModel->findById($authUser['id']);

        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        Response::json($user);
    }

    private function setRefreshCookie(string $token): void
    {
        setcookie('refresh_token', $token, [
            'expires'  => time() + $this->jwt->getRefreshTtl(),
            'path'     => '/',
            'httponly'  => true,
            'samesite' => 'Lax',
            'secure'   => isset($_SERVER['HTTPS']),
        ]);
    }
}
