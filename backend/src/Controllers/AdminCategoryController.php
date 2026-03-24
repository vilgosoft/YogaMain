<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Category;
use App\Services\ValidationService;

class AdminCategoryController
{
    private Category $model;
    private ValidationService $validator;

    public function __construct()
    {
        $this->model = new Category();
        $this->validator = new ValidationService();
    }

    public function index(): void
    {
        $categories = $this->model->getAll();

        // Attach course count
        foreach ($categories as &$cat) {
            $cat['course_count'] = $this->model->getCourseCount($cat['id']);
        }

        Response::json($categories);
    }

    public function create(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $valid = $this->validator->validate($data, [
            'name' => ['required', ['max', 100]],
            'slug' => ['required', 'slug', ['max', 120]],
        ]);

        if (!$valid) {
            Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
        }

        if ($this->model->findBySlug($data['slug'])) {
            Response::error('Slug already exists', 'VALIDATION_ERROR', 409, ['slug' => 'This slug is already in use']);
        }

        $id = $this->model->create([
            'name'        => htmlspecialchars($data['name'], ENT_QUOTES, 'UTF-8'),
            'slug'        => $data['slug'],
            'description' => $data['description'] ?? null,
            'sort_order'  => (int) ($data['sort_order'] ?? 0),
            'is_active'   => (int) ($data['is_active'] ?? 1),
        ]);

        $category = $this->model->findById($id);
        Response::json($category, 'Category created', 201);
    }

    public function update(array $params): void
    {
        $id = (int) $params['id'];
        $category = $this->model->findById($id);

        if (!$category) {
            Response::error('Category not found', 'NOT_FOUND', 404);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (isset($data['slug']) && $data['slug'] !== $category['slug']) {
            if ($this->model->findBySlug($data['slug'])) {
                Response::error('Slug already exists', 'VALIDATION_ERROR', 409, ['slug' => 'This slug is already in use']);
            }
        }

        $updateData = [];
        if (isset($data['name'])) $updateData['name'] = htmlspecialchars($data['name'], ENT_QUOTES, 'UTF-8');
        if (isset($data['slug'])) $updateData['slug'] = $data['slug'];
        if (array_key_exists('description', $data)) $updateData['description'] = $data['description'];
        if (isset($data['sort_order'])) $updateData['sort_order'] = (int) $data['sort_order'];
        if (isset($data['is_active'])) $updateData['is_active'] = (int) $data['is_active'];

        $this->model->update($id, $updateData);

        $updated = $this->model->findById($id);
        Response::json($updated, 'Category updated');
    }

    public function delete(array $params): void
    {
        $id = (int) $params['id'];

        if (!$this->model->findById($id)) {
            Response::error('Category not found', 'NOT_FOUND', 404);
        }

        $deleted = $this->model->delete($id);

        if (!$deleted) {
            Response::error('Cannot delete category with existing courses', 'HAS_DEPENDENCIES', 400);
        }

        Response::json(null, 'Category deleted');
    }
}
