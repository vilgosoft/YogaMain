<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\User;
use App\Models\Course;
use App\Models\Enrollment;
use App\Config\Database;
use App\Services\ValidationService;
use PDOException;

class AdminUserController
{
    private User $model;
    private ValidationService $validator;

    public function __construct()
    {
        $this->model = new User();
        $this->validator = new ValidationService();
    }

    /**
     * @return list<array{course_id: int, title: string, enrolled_at: string}>
     */
    private function fetchPurchasedCoursesForUser(int $userId): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare(
            'SELECT c.id AS course_id, c.title, e.enrolled_at FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.user_id = :user_id ORDER BY e.enrolled_at DESC'
        );
        $stmt->execute(['user_id' => $userId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['course_id'] = (int) $row['course_id'];
        }

        return $rows;
    }

    public function index(): void
    {
        $page = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 12);
        $search = $_GET['search'] ?? '';

        $result = $this->model->getPaginated($page, $perPage, $search);

        foreach ($result['users'] as &$user) {
            $user['purchased_courses'] = $this->fetchPurchasedCoursesForUser((int) $user['id']);
        }

        Response::json($result['users'], '', 200, $result['meta']);
    }

    public function setEnrollments(array $params): void
    {
        $id = (int) $params['id'];
        $user = $this->model->findById($id);

        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!array_key_exists('course_ids', $data)) {
            Response::error('course_ids array is required', 'VALIDATION_ERROR', 422);
        }

        $courseIds = $data['course_ids'];
        if (!is_array($courseIds)) {
            Response::error('course_ids must be an array', 'VALIDATION_ERROR', 422);
        }

        $courseIds = array_values(array_unique(array_filter(
            array_map(static fn ($v) => (int) $v, $courseIds),
            static fn (int $v) => $v > 0
        )));

        $courseModel = new Course();
        foreach ($courseIds as $cid) {
            if ($courseModel->findById($cid) === null) {
                Response::error("Invalid course_id: {$cid}", 'VALIDATION_ERROR', 422);
            }
        }

        $enrollment = new Enrollment();
        $enrollment->syncUserEnrollments($id, $courseIds);

        Response::json([
            'purchased_courses' => $this->fetchPurchasedCoursesForUser($id),
        ], 'Course access updated');
    }

    public function update(array $params): void
    {
        $id = (int) $params['id'];
        $user = $this->model->findById($id);

        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $db = Database::getConnection();
        $fields = [];
        $updateParams = ['id' => $id];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if (!$this->validator->validate(['name' => $name], ['name' => ['required', ['min', 2], ['max', 255]]])) {
                Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
            }
            $fields[] = 'name = :name';
            $updateParams['name'] = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        }

        if (array_key_exists('email', $data)) {
            $email = strtolower(trim((string) $data['email']));
            if (!$this->validator->validate(['email' => $email], ['email' => ['required', 'email', ['max', 255]]])) {
                Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
            }
            if ($this->model->emailTakenByOtherUser($email, $id)) {
                Response::error('Email already in use', 'VALIDATION_ERROR', 409, ['email' => 'This email is already in use']);
            }
            $fields[] = 'email = :email';
            $updateParams['email'] = $email;
        }

        if (array_key_exists('phone', $data)) {
            $phone = preg_replace('/\D/', '', (string) $data['phone']);
            if (!$this->validator->validate(['phone' => $phone], ['phone' => ['required', 'phone']])) {
                Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
            }
            if ($this->model->phoneTakenByOtherUser($phone, $id)) {
                Response::error('Phone already in use', 'VALIDATION_ERROR', 409, ['phone' => 'This phone number is already in use']);
            }
            $fields[] = 'phone = :phone';
            $updateParams['phone'] = $phone;
        }

        if (isset($data['is_active'])) {
            $fields[] = 'is_active = :is_active';
            $updateParams['is_active'] = (int) $data['is_active'];
        }

        if (isset($data['role']) && in_array($data['role'], ['user', 'admin'], true)) {
            if ($data['role'] === 'user' && ($user['role'] ?? '') === 'admin') {
                $adminCount = (int) $db->query(
                    "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1"
                )->fetchColumn();
                if ($adminCount <= 1) {
                    Response::error(
                        'Cannot demote the only active administrator',
                        'VALIDATION_ERROR',
                        422
                    );
                }
            }
            $fields[] = 'role = :role';
            $updateParams['role'] = $data['role'];
        }

        if (empty($fields)) {
            Response::error('No valid fields to update', 'VALIDATION_ERROR', 422);
        }

        $stmt = $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($updateParams);

        $updated = $this->model->findById($id);
        Response::json($updated, 'User updated');
    }

    public function delete(array $params): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id < 1) {
            Response::error('Invalid user id', 'VALIDATION_ERROR', 422);
        }

        $actorId = (int) ($GLOBALS['auth_user']['id'] ?? 0);
        if ($id === $actorId) {
            Response::error('You cannot delete your own account', 'VALIDATION_ERROR', 422);
        }

        $user = $this->model->findById($id);
        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        if (($user['role'] ?? '') === 'admin') {
            $db = Database::getConnection();
            $adminCount = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
            if ($adminCount <= 1) {
                Response::error('Cannot delete the only administrator account', 'VALIDATION_ERROR', 422);
            }
        }

        try {
            $deleted = $this->model->deleteById($id);
        } catch (PDOException $e) {
            Response::error('Could not delete user (data may still be referenced)', 'DELETE_FAILED', 409);
        }

        if (!$deleted) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        Response::json(null, 'User deleted');
    }
}
