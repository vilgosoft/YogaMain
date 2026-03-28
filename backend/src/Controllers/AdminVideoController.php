<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Helpers\FileUpload;
use App\Helpers\GoogleDriveVideo;
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

        $videoUrl = trim((string) ($data['video_url'] ?? ''));
        $storedPath = null;
        $transcodeStatus = 'ready';

        if ($videoUrl !== '') {
            if (!filter_var($videoUrl, FILTER_VALIDATE_URL)) {
                Response::error('Invalid video URL', 'VALIDATION_ERROR', 422, ['video_url' => 'Enter a valid URL']);
            }
            $host = parse_url($videoUrl, PHP_URL_HOST);
            if (!is_string($host) || !str_contains($host, 'drive.google.com')) {
                Response::error(
                    'Only Google Drive links are supported',
                    'VALIDATION_ERROR',
                    422,
                    ['video_url' => 'Use a Google Drive share link (drive.google.com)']
                );
            }
            if (GoogleDriveVideo::extractFileId($videoUrl) === null) {
                Response::error(
                    'Could not read the file ID from this link',
                    'VALIDATION_ERROR',
                    422,
                    ['video_url' => 'Open the file in Drive → Share → copy link (contains /file/d/...)']
                );
            }
            $storedPath = $videoUrl;
        } elseif (!empty($_FILES['video']) && $_FILES['video']['error'] === UPLOAD_ERR_OK) {
            $path = FileUpload::handleVideo($_FILES['video']);
            if (!$path) {
                Response::error('Video upload failed', 'UPLOAD_FAILED', 500);
            }
            $storedPath = $path;
            $transcodeStatus = 'pending';
        } else {
            Response::error(
                'Google Drive URL is required',
                'VALIDATION_ERROR',
                422,
                ['video_url' => 'Paste your Google Drive video share link']
            );
        }

        $sortOrder = $this->model->getNextSortOrder((int) $data['course_id']);

        $id = $this->model->create([
            'course_id'        => (int) $data['course_id'],
            'title'            => htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8'),
            'description'      => $data['description'] ?? null,
            'original_file'    => $storedPath,
            'duration_sec'     => !empty($data['duration_sec']) ? (int) $data['duration_sec'] : null,
            'sort_order'       => (int) ($data['sort_order'] ?? $sortOrder),
            'is_preview'       => (int) ($data['is_preview'] ?? 0),
            'transcode_status' => $transcodeStatus,
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
        if (isset($data['title'])) {
            $updateData['title'] = htmlspecialchars($data['title'], ENT_QUOTES, 'UTF-8');
        }
        if (array_key_exists('description', $data)) {
            $updateData['description'] = $data['description'];
        }
        if (isset($data['sort_order'])) {
            $updateData['sort_order'] = (int) $data['sort_order'];
        }
        if (isset($data['is_preview'])) {
            $updateData['is_preview'] = (int) $data['is_preview'];
        }
        if (isset($data['video_url'])) {
            $url = trim((string) $data['video_url']);
            if ($url === '') {
                Response::error('video_url cannot be empty', 'VALIDATION_ERROR', 422);
            }
            if (!filter_var($url, FILTER_VALIDATE_URL)) {
                Response::error('Invalid video URL', 'VALIDATION_ERROR', 422);
            }
            $host = parse_url($url, PHP_URL_HOST);
            if (!is_string($host) || !str_contains($host, 'drive.google.com')) {
                Response::error('Only Google Drive links are supported', 'VALIDATION_ERROR', 422);
            }
            if (GoogleDriveVideo::extractFileId($url) === null) {
                Response::error('Could not read file ID from Google Drive link', 'VALIDATION_ERROR', 422);
            }
            $updateData['original_file'] = $url;
            $updateData['transcode_status'] = 'ready';
        }

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

        $orig = $video['original_file'] ?? '';
        if ($orig !== '' && !str_starts_with($orig, 'http://') && !str_starts_with($orig, 'https://') && file_exists($orig)) {
            unlink($orig);
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
