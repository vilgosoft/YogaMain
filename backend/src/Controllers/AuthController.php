<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\User;
use App\Models\RefreshToken;
use App\Models\PasswordResetToken;
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

    public function forgotPassword(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $valid = $this->validator->validate($data, [
            'email' => ['required', 'email'],
        ]);

        if (!$valid) {
            Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
        }

        $email = strtolower(trim($data['email']));
        $user = $this->userModel->findByEmail($email);

        if ($user && (int) $user['is_active'] === 1) {
            $base = rtrim((string) ($_ENV['FRONTEND_URL'] ?? $_ENV['APP_URL'] ?? ''), '/');
            if ($base !== '') {
                $plain = bin2hex(random_bytes(32));
                $tokenHash = hash('sha256', $plain);
                $expires = (new \DateTimeImmutable('+1 hour'))->format('Y-m-d H:i:s');
                try {
                    $prt = new PasswordResetToken();
                    $prt->create((int) $user['id'], $tokenHash, $expires);
                } catch (\Throwable $e) {
                    error_log('password_reset_tokens: ' . $e->getMessage());
                    Response::error(
                        'Password reset is temporarily unavailable. Ensure migration 003_password_reset_tokens.sql was applied.',
                        'SERVER_ERROR',
                        503
                    );
                }
                $link = $base . '/reset-password?token=' . urlencode($plain);
                $this->sendPasswordResetEmail((string) $user['email'], $link);
            } else {
                error_log('Forgot password: set FRONTEND_URL (or APP_URL) in .env so reset links can be built.');
            }
        }

        $message = 'If an account exists for this email, you will receive password reset instructions shortly.';
        Response::json(['message' => $message], $message);
    }

    public function resetPassword(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $valid = $this->validator->validate($data, [
            'token'    => ['required', ['min', 10]],
            'password' => ['required', ['min', 8]],
        ]);

        if (!$valid) {
            Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
        }

        $plain = trim((string) $data['token']);
        $tokenHash = hash('sha256', $plain);
        $prt = new PasswordResetToken();
        $row = $prt->findValidByTokenHash($tokenHash);

        if (!$row) {
            Response::error(
                'This reset link is invalid or has expired. Please request a new one.',
                'INVALID_TOKEN',
                400
            );
        }

        $newHash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        $this->userModel->updatePasswordHash($row['user_id'], $newHash);
        $prt->deleteByTokenHash($tokenHash);
        $this->refreshTokenModel->revokeAllForUser($row['user_id']);

        Response::json(null, 'Password updated. You can sign in with your new password.');
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
        $isSecure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
            || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
            || ($_SERVER['REQUEST_SCHEME'] ?? '') === 'https'
            || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443;

        setcookie('refresh_token', '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'httponly'  => true,
            'samesite' => 'Lax',
            'secure'   => $isSecure,
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

    private function sendPasswordResetEmail(string $to, string $resetLink): void
    {
        $fromName = $_ENV['MAIL_FROM_NAME'] ?? 'SAI ISHANI Yogashala';
        $fromAddr = $_ENV['MAIL_FROM'] ?? 'noreply@localhost';
        $subject = 'Reset your password';
        $safeLink = htmlspecialchars($resetLink, ENT_QUOTES, 'UTF-8');
        $html = '<p>Hi,</p>'
            . '<p>We received a request to reset your password. This link is valid for <strong>1 hour</strong>:</p>'
            . '<p><a href="' . $safeLink . '">Reset your password</a></p>'
            . '<p>If you did not request this, you can ignore this email.</p>';

        $headers = "MIME-Version: 1.0\r\n"
            . "Content-type: text/html; charset=UTF-8\r\n"
            . 'From: ' . $this->encodeHeaderName($fromName) . " <{$fromAddr}>\r\n";

        $ok = @mail($to, $subject, $html, $headers);
        if (!$ok) {
            error_log('Password reset email could not be sent via mail() to ' . $to);
        }
    }

    private function encodeHeaderName(string $name): string
    {
        if (preg_match('/[^\x20-\x7E]/', $name)) {
            return '=?UTF-8?B?' . base64_encode($name) . '?=';
        }

        return $name;
    }

    private function setRefreshCookie(string $token): void
    {
        // Detect HTTPS: direct or behind reverse proxy/CDN (Hostinger, Cloudflare, etc.)
        $isSecure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
            || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
            || ($_SERVER['REQUEST_SCHEME'] ?? '') === 'https'
            || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443;

        setcookie('refresh_token', $token, [
            'expires'  => time() + $this->jwt->getRefreshTtl(),
            'path'     => '/',
            'httponly'  => true,
            'samesite' => 'Lax',
            'secure'   => $isSecure,
        ]);
    }
}
