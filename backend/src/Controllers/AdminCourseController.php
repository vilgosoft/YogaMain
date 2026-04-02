<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Helpers\FileUpload;
use App\Models\Course;
use App\Services\ValidationService;

class AdminCourseController
{
    private Course $model;
    private ValidationService $validator;

    public function __construct()
    {
        $this->model = new Course();
        $this->validator = new ValidationService();
    }

    public function index(): void
    {
        $page = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 12);
        $search = $_GET['search'] ?? '';
        $categoryId = $_GET['category_id'] ?? null;

        $result = $this->model->getPaginated($page, $perPage, [
            'search' => $search,
            'category_id' => $categoryId,
        ]);

        Response::json($result['courses'], '', 200, $result['meta']);
    }

    /** Compact list for assigning course access to users. */
    public function enrollmentOptions(): void
    {
        try {
            Response::json($this->model->listForEnrollmentAdmin());
        } catch (\Throwable $e) {
            error_log('enrollmentOptions: ' . $e->getMessage());
            $isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
            Response::error(
                $isDev ? $e->getMessage() : 'Could not load course list',
                'SERVER_ERROR',
                500
            );
        }
    }

    public function create(): void
    {
        $data = $this->trimPostStrings($_POST);
        $title = $data['title'] ?? '';
        $data['slug'] = $this->normalizeCourseSlug($data['slug'] ?? '', $title);

        $valid = $this->validator->validate($data, [
            'title'       => ['required', ['max', 255]],
            'slug'        => ['required', 'slug', ['max', 280]],
            'category_id' => ['required', 'numeric'],
            'price'       => ['required', 'numeric'],
        ]);

        if (!$valid) {
            Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
        }

        // Handle thumbnail upload
        $thumbnailUrl = null;
        if (!empty($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === UPLOAD_ERR_OK) {
            $thumbnailUrl = FileUpload::handleImage($_FILES['thumbnail']);
        }

        $id = $this->model->create([
            'category_id'    => (int) $data['category_id'],
            'title'          => htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8'),
            'slug'           => $data['slug'],
            'description'    => $data['description'] ?? null,
            'short_desc'     => $data['short_desc'] ?? null,
            'thumbnail_url'  => $thumbnailUrl,
            'price'          => (float) $data['price'],
            'discount_price' => !empty($data['discount_price']) ? (float) $data['discount_price'] : null,
            'difficulty'     => $data['difficulty'] ?? 'beginner',
            'duration_hours' => !empty($data['duration_hours']) ? (float) $data['duration_hours'] : null,
            'is_published'   => (int) ($data['is_published'] ?? 0),
            'is_free'        => (int) ($data['is_free'] ?? 0),
            'is_upcoming'    => (int) ($data['is_upcoming'] ?? 0),
            'sort_order'     => (int) ($data['sort_order'] ?? 0),
        ]);

        $course = $this->model->findById($id);
        Response::json($course, 'Course created', 201);
    }

    public function update(array $params): void
    {
        $id = (int) $params['id'];
        $course = $this->model->findById($id);

        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $data = $this->trimPostStrings($_POST);
        if (array_key_exists('slug', $data) || array_key_exists('title', $data)) {
            $title = $data['title'] ?? $course['title'];
            $slugIn = $data['slug'] ?? ($course['slug'] ?? '');
            $data['slug'] = $this->normalizeCourseSlug($slugIn, (string) $title);
        }

        // Handle thumbnail upload
        if (!empty($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === UPLOAD_ERR_OK) {
            $data['thumbnail_url'] = FileUpload::handleImage($_FILES['thumbnail']);
        }

        $updateData = [];
        $allowed = ['category_id', 'title', 'slug', 'description', 'short_desc', 'thumbnail_url', 'price', 'discount_price', 'difficulty', 'duration_hours', 'is_published', 'is_free', 'is_upcoming', 'sort_order'];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];
                if (in_array($field, ['category_id', 'is_published', 'is_free', 'is_upcoming', 'sort_order'])) {
                    $val = (int) $val;
                } elseif (in_array($field, ['price', 'discount_price', 'duration_hours'])) {
                    $val = $val !== '' ? (float) $val : null;
                } elseif ($field === 'title') {
                    $val = htmlspecialchars($val, ENT_QUOTES, 'UTF-8');
                }
                $updateData[$field] = $val;
            }
        }

        $this->model->update($id, $updateData);

        $updated = $this->model->findById($id);
        Response::json($updated, 'Course updated');
    }

    public function delete(array $params): void
    {
        $id = (int) $params['id'];

        if (!$this->model->findById($id)) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $this->model->delete($id);
        Response::json(null, 'Course deleted');
    }

    public function stats(): void
    {
        $stats = $this->model->getStats();
        Response::json($stats);
    }

    /** @param array<string, mixed> $post */
    private function trimPostStrings(array $post): array
    {
        $out = [];
        foreach ($post as $k => $v) {
            $out[$k] = is_string($v) ? trim($v) : $v;
        }
        return $out;
    }

    private function slugFromTitle(string $title): string
    {
        $s = strtolower(trim($title));
        $s = preg_replace('/\s+/u', '-', $s);
        $s = preg_replace('/[^a-z0-9\-]+/u', '-', $s);
        $s = preg_replace('/-+/', '-', $s);
        $s = trim($s, '-');

        return $s !== '' ? $s : 'course';
    }

    private function normalizeCourseSlug(string $slug, string $title): string
    {
        $s = strtolower(trim($slug));
        if ($s === '') {
            return $this->slugFromTitle($title);
        }
        $s = preg_replace('/\s+/u', '-', $s);
        $s = preg_replace('/[^a-z0-9\-]+/u', '-', $s);
        $s = preg_replace('/-+/', '-', $s);
        $s = trim($s, '-');

        return $s !== '' ? $s : $this->slugFromTitle($title);
    }
}
