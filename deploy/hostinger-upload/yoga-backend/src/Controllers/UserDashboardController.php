<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Enrollment;

class UserDashboardController
{
    private Enrollment $enrollmentModel;

    public function __construct()
    {
        $this->enrollmentModel = new Enrollment();
    }

    public function myLearning(): void
    {
        $userId = $GLOBALS['auth_user']['id'];
        $enrollments = $this->enrollmentModel->getByUser($userId);
        Response::json($enrollments);
    }
}
