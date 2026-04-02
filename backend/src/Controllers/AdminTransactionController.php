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

    public function delete(array $params): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id < 1) {
            Response::error('Invalid transaction id', 'VALIDATION_ERROR', 422);
        }

        $deleted = $this->model->deleteById($id);
        if (!$deleted) {
            Response::error('Transaction not found', 'NOT_FOUND', 404);
        }

        Response::json(null, 'Transaction deleted');
    }
}
