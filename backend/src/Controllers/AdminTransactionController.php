<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Transaction;

class AdminTransactionController
{
    private Transaction $model;

    public function __construct()
    {
        $this->model = new Transaction();
    }

    public function index(): void
    {
        $page = (int) ($_GET['page'] ?? 1);
        $perPage = (int) ($_GET['per_page'] ?? 12);
        $status = $_GET['status'] ?? null;

        $result = $this->model->getPaginated($page, $perPage, [
            'status' => $status,
        ]);

        Response::json($result['transactions'], '', 200, $result['meta']);
    }
}
