<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\User;
use App\Config\Database;

class AdminUserController
{
    private User $model;

    public function __construct()
    {
        $this->model = new User();
    }

    public function index(): void
    {
        $page = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 12);
        $search = $_GET['search'] ?? '';

        $result = $this->model->getPaginated($page, $perPage, $search);

        // Attach purchased courses for each user
        $db = Database::getConnection();
        foreach ($result['users'] as &$user) {
            $stmt = $db->prepare(
                'SELECT c.title, e.enrolled_at FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE e.user_id = :user_id ORDER BY e.enrolled_at DESC'
            );
            $stmt->execute(['user_id' => $user['id']]);
            $user['purchased_courses'] = $stmt->fetchAll();
        }

        Response::json($result['users'], '', 200, $result['meta']);
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

        if (isset($data['is_active'])) {
            $fields[] = 'is_active = :is_active';
            $updateParams['is_active'] = (int) $data['is_active'];
        }

        if (isset($data['role']) && in_array($data['role'], ['user', 'admin'], true)) {
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
}
