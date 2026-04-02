<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Helpers\RequestAuth;
use App\Helpers\GoogleDriveVideo;
use App\Models\Course;
use App\Models\Category;
use App\Models\Video;
use App\Models\Enrollment;
use App\Models\VideoProgress;
use App\Services\JwtService;

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

        $courses = $this->attachEnrollmentFlags($result['courses'], $this->getOptionalAuthUser());

        Response::json($courses, '', 200, $result['meta']);
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
        // This is a public route (no AuthMiddleware), so we parse the JWT manually
        $isEnrolled = false;
        $authUser = $this->getOptionalAuthUser();
        if ($authUser) {
            $enrollmentModel = new Enrollment();
            $isEnrolled = $enrollmentModel->isEnrolled($authUser['id'], $course['id']);
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
        $courses = $this->attachEnrollmentFlags($result['courses'], $this->getOptionalAuthUser());
        Response::json($courses);
    }

    public function landingStats(): void
    {
        Response::json($this->courseModel->getLandingStats());
    }

    /**
     * GET /videos/:id — returns play URL (HTML5 file or Google Drive preview iframe)
     */
    public function getVideo(array $params): void
    {
        $videoId = (int) $params['id'];
        $video = $this->videoModel->findById($videoId);

        if (!$video) {
            Response::error('Video not found', 'NOT_FOUND', 404);
        }

        if ($video['is_preview']) {
            Response::json($this->videoAccessPayload($video));
            return;
        }

        $authUser = $this->viewerFromJwtOrGlobals();
        if (!$authUser) {
            Response::error('Authentication required', 'UNAUTHORIZED', 401);
        }

        $enrollmentModel = new Enrollment();
        if (!$enrollmentModel->isEnrolled($authUser['id'], $video['course_id'])) {
            Response::error('You must be enrolled in this course', 'FORBIDDEN', 403);
        }

        Response::json($this->videoAccessPayload($video));
    }

    /**
     * @param array<string, mixed> $video
     * @return array{video_url: string, title: string, player_kind: string}
     */
    private function videoAccessPayload(array $video): array
    {
        $stored = trim((string) ($video['original_file'] ?? ''));
        if ($stored === '') {
            Response::error('Video URL not configured', 'VIDEO_NOT_FOUND', 404);
        }

        if (GoogleDriveVideo::isDriveUrl($stored)) {
            $preview = GoogleDriveVideo::toPreviewUrl($stored);
            if (!$preview) {
                Response::error(
                    'Invalid Google Drive link. Use a share link like https://drive.google.com/file/d/FILE_ID/view',
                    'INVALID_VIDEO_URL',
                    422
                );
            }

            return [
                'video_url'    => $preview,
                'title'        => $video['title'],
                'player_kind'  => 'drive_iframe',
            ];
        }

        return [
            'video_url'    => $stored,
            'title'        => $video['title'],
            'player_kind'  => 'html5',
        ];
    }

    private function viewerFromJwtOrGlobals(): ?array
    {
        if (!empty($GLOBALS['auth_user'])) {
            return $GLOBALS['auth_user'];
        }

        $authHeader = RequestAuth::bearerHeader();
        if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            return null;
        }

        $jwt = new JwtService();
        $decoded = $jwt->decode($matches[1]);
        if (!$decoded) {
            return null;
        }

        return [
            'id'    => (int) $decoded->sub,
            'email' => $decoded->email,
            'role'  => $decoded->role,
        ];
    }

    /**
     * GET /player/course/:courseId — curriculum + per-lesson progress (enrolled users).
     */
    public function playerCurriculum(array $params): void
    {
        $courseId = (int) $params['courseId'];
        $authUser = $GLOBALS['auth_user'] ?? null;
        if (!$authUser) {
            Response::error('Authentication required', 'UNAUTHORIZED', 401);
        }

        $userId = (int) $authUser['id'];
        $course = $this->courseModel->findById($courseId);
        if (!$course || !$course['is_published']) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $enrollmentModel = new Enrollment();
        if (!$enrollmentModel->isEnrolled($userId, $courseId)) {
            Response::error('You must be enrolled in this course', 'FORBIDDEN', 403);
        }

        $videos  = $this->videoModel->getByCourseId($courseId);
        $vpModel = new VideoProgress();
        $lessons = [];
        $completedLessons = 0;
        $totalDurationSec = 0;

        foreach ($videos as $v) {
            $vid = (int) $v['id'];
            $dur = $v['duration_sec'] !== null ? (int) $v['duration_sec'] : 0;
            $totalDurationSec += $dur;

            $row     = $vpModel->getForUserVideo($userId, $vid);
            $watched = $row ? (int) $row['watched_sec'] : 0;
            $done    = $row && (int) $row['is_completed'] === 1;
            if ($done) {
                $completedLessons++;
            }

            $lessonPct = 0;
            if ($done) {
                $lessonPct = 100;
            } elseif ($dur > 0) {
                $lessonPct = min(100, (int) round(($watched / $dur) * 100));
            } elseif ($watched > 0) {
                $lessonPct = 5;
            }

            $lessons[] = [
                'id'                  => $vid,
                'title'               => $v['title'],
                'description'         => $v['description'],
                'duration_sec'        => $v['duration_sec'] !== null ? (int) $v['duration_sec'] : null,
                'sort_order'          => (int) $v['sort_order'],
                'is_preview'          => (bool) $v['is_preview'],
                'watched_sec'         => $watched,
                'is_completed'        => $done,
                'lesson_progress_pct' => $lessonPct,
            ];
        }

        $enrollmentModel->updateProgress($userId, $courseId);
        $courseProgressPct = $enrollmentModel->getProgressPct($userId, $courseId);

        Response::json([
            'course' => [
                'id'            => (int) $course['id'],
                'title'         => $course['title'],
                'slug'          => $course['slug'],
                'category_name' => $course['category_name'] ?? null,
                'short_desc'    => $course['short_desc'] ?? null,
                'thumbnail_url' => $course['thumbnail_url'] ?? null,
            ],
            'lessons'             => $lessons,
            'completed_lessons'   => $completedLessons,
            'total_lessons'       => count($lessons),
            'course_progress_pct' => $courseProgressPct,
            'total_duration_sec'  => $totalDurationSec,
        ]);
    }

    /**
     * POST /videos/:id/progress — save watch position (updates enrollment %).
     */
    public function saveVideoProgress(array $params): void
    {
        $videoId = (int) $params['id'];
        $authUser = $GLOBALS['auth_user'] ?? null;
        if (!$authUser) {
            Response::error('Authentication required', 'UNAUTHORIZED', 401);
        }

        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $watched = (int) ($body['watched_sec'] ?? 0);
        $force   = !empty($body['mark_complete']);

        $video = $this->videoModel->findById($videoId);
        if (!$video) {
            Response::error('Video not found', 'NOT_FOUND', 404);
        }

        $userId = (int) $authUser['id'];
        $courseId = (int) $video['course_id'];

        $enrollmentModel = new Enrollment();
        if (!$enrollmentModel->isEnrolled($userId, $courseId)) {
            Response::error('You must be enrolled in this course', 'FORBIDDEN', 403);
        }

        $durationSec = $video['duration_sec'] !== null ? (int) $video['duration_sec'] : null;
        (new VideoProgress())->upsert($userId, $videoId, $watched, $force, $durationSec);
        $enrollmentModel->updateProgress($userId, $courseId);

        Response::json([
            'course_progress_pct' => $enrollmentModel->getProgressPct($userId, $courseId),
        ]);
    }

    /**
     * Try to extract user info from JWT without requiring authentication.
     * Returns null if no valid token is present.
     */
    private function getOptionalAuthUser(): ?array
    {
        // Check if middleware already set it
        if (!empty($GLOBALS['auth_user'])) {
            return $GLOBALS['auth_user'];
        }

        $authHeader = RequestAuth::bearerHeader();
        if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            return null;
        }

        $jwt = new JwtService();
        $decoded = $jwt->decode($matches[1]);
        if (!$decoded) {
            return null;
        }

        return [
            'id'    => (int) $decoded->sub,
            'email' => $decoded->email,
            'role'  => $decoded->role,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $courses
     * @return array<int, array<string, mixed>>
     */
    private function attachEnrollmentFlags(array $courses, ?array $authUser): array
    {
        if ($authUser === null || $courses === []) {
            foreach ($courses as $i => $c) {
                $courses[$i]['is_enrolled'] = false;
            }

            return $courses;
        }

        $userId  = (int) $authUser['id'];
        $ids     = array_map(static fn ($c) => (int) $c['id'], $courses);
        $enrolled = array_flip((new Enrollment())->getEnrolledCourseIds($userId, $ids));

        foreach ($courses as $i => $c) {
            $courses[$i]['is_enrolled'] = isset($enrolled[(int) $c['id']]);
        }

        return $courses;
    }
}
