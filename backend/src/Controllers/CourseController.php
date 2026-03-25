<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Course;
use App\Models\Category;
use App\Models\Video;
use App\Models\Enrollment;

class CourseController
{
    private Course $courseModel;
    private Category $categoryModel;
    private Video $videoModel;

    public function __construct()
    {
        $this->courseModel = new Course();
        $this->categoryModel = new Category();
        $this->videoModel = new Video();
    }

    public function index(): void
    {
        $page = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 12);
        $search = $_GET['search'] ?? '';
        $categoryId = $_GET['category_id'] ?? null;

        $result = $this->courseModel->getPaginated($page, $perPage, [
            'published_only' => true,
            'search' => $search,
            'category_id' => $categoryId,
        ]);

        Response::json($result['courses'], '', 200, $result['meta']);
    }

    public function show(array $params): void
    {
        $slug = $params['slug'];
        $course = $this->courseModel->findBySlug($slug);

        if (!$course || !$course['is_published']) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        // Get videos (only titles and metadata for public view)
        $videos = $this->videoModel->getByCourseId($course['id']);
        $publicVideos = array_map(function ($v) {
            return [
                'id'            => $v['id'],
                'title'         => $v['title'],
                'description'   => $v['description'],
                'duration_sec'  => $v['duration_sec'],
                'sort_order'    => $v['sort_order'],
                'is_preview'    => $v['is_preview'],
            ];
        }, $videos);

        // Check enrollment if user is authenticated
        $isEnrolled = false;
        if (!empty($GLOBALS['auth_user'])) {
            $enrollmentModel = new Enrollment();
            $isEnrolled = $enrollmentModel->isEnrolled($GLOBALS['auth_user']['id'], $course['id']);
        }

        Response::json([
            'course'      => $course,
            'videos'      => $publicVideos,
            'is_enrolled' => $isEnrolled,
        ]);
    }

    public function categories(): void
    {
        $categories = $this->categoryModel->getAll(true);
        Response::json($categories);
    }

    public function featured(): void
    {
        $result = $this->courseModel->getPaginated(1, 6, [
            'published_only' => true,
        ]);
        Response::json($result['courses']);
    }
}
