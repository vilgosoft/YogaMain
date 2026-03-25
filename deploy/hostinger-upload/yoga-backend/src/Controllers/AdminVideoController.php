<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Helpers\FileUpload;
use App\Models\Video;
use App\Models\Course;
use App\Services\ValidationService;

class AdminVideoController
{
    private Video $model;
    private Course $courseModel;
    private ValidationService $validator;

    public function __construct()
    {
        $this->model = new Video();
        $this->courseModel = new Course();
        $this->validator = new ValidationService();
    }

    public function index(array $params): void
    {
        $courseId = (int) $params['courseId'];

        $course = $this->courseModel->findById($courseId);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $videos = $this->model->getByCourseId($courseId);
        Response::json(['course' => $course, 'videos' => $videos]);
    }

    public function create(): void
    {
        $data = $_POST;

        $valid = $this->validator->validate($data, [
            'course_id' => ['required', 'numeric'],
            'title'     => ['required', ['max', 255]],
        ]);

        if (!$valid) {
            Response::error('Validation failed', 'VALIDATION_ERROR', 422, $this->validator->getErrors());
        }

        $course = $this->courseModel->findById((int) $data['course_id']);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        // Handle video file upload
        if (empty($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Video file is required', 'VALIDATION_ERROR', 422, ['video' => 'Please upload a video file']);
        }

        $videoPath = FileUpload::handleVideo($_FILES['video']);
        if (!$videoPath) {
            Response::error('Video upload failed', 'UPLOAD_FAILED', 500);
        }

        $sortOrder = $this->model->getNextSortOrder((int) $data['course_id']);

        $id = $this->model->create([
            'course_id'     => (int) $data['course_id'],
            'title'         => htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8'),
            'description'   => $data['description'] ?? null,
            'original_file' => $videoPath,
            'duration_sec'  => !empty($data['duration_sec']) ? (int) $data['duration_sec'] : null,
            'sort_order'    => (int) ($data['sort_order'] ?? $sortOrder),
            'is_preview'    => (int) ($data['is_preview'] ?? 0),
        ]);

        $video = $this->model->findById($id);
        Response::json($video, 'Video uploaded successfully', 201);
    }

    public function update(array $params): void
    {
        $id = (int) $params['id'];
        $video = $this->model->findById($id);

        if (!$video) {
            Response::error('Video not found', 'NOT_FOUND', 404);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $updateData = [];
        if (isset($data['title'])) $updateData['title'] = htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8');
        if (array_key_exists('description', $data)) $updateData['description'] = $data['description'];
        if (isset($data['sort_order'])) $updateData['sort_order'] = (int) $data['sort_order'];
        if (isset($data['is_preview'])) $updateData['is_preview'] = (int) $data['is_preview'];

        $this->model->update($id, $updateData);

        $updated = $this->model->findById($id);
        Response::json($updated, 'Video updated');
    }

    public function delete(array $params): void
    {
        $id = (int) $params['id'];
        $video = $this->model->findById($id);

        if (!$video) {
            Response::error('Video not found', 'NOT_FOUND', 404);
        }

        // Delete the original file
        if ($video['original_file'] && file_exists($video['original_file'])) {
            unlink($video['original_file']);
        }

        // Delete HLS segments directory
        if ($video['hls_path']) {
            $hlsDir = dirname($video['hls_path']);
            if (is_dir($hlsDir)) {
                $files = glob($hlsDir . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) unlink($file);
                }
                // Remove subdirectories too
                $dirs = glob($hlsDir . '/*', GLOB_ONLYDIR);
                foreach ($dirs as $dir) {
                    $subFiles = glob($dir . '/*');
                    foreach ($subFiles as $f) unlink($f);
                    rmdir($dir);
                }
                rmdir($hlsDir);
            }
        }

        $this->model->delete($id);
        Response::json(null, 'Video deleted');
    }
}
