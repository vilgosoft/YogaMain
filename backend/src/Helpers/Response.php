<?php

namespace App\Helpers;

class Response
{
    public static function json($data = null, string $message = '', int $status = 200, array $meta = []): void
    {
        http_response_code($status);
        header('Content-Type: application/json');

        $response = ['success' => $status >= 200 && $status < 300];

        if ($data !== null) {
            $response['data'] = $data;
        }

        if ($message) {
            $response['message'] = $message;
        }

        if (!empty($meta)) {
            $response['meta'] = $meta;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $message, string $code = 'ERROR', int $status = 400, array $fields = []): void
    {
        http_response_code($status);
        header('Content-Type: application/json');

        $error = [
            'code'    => $code,
            'message' => $message,
        ];

        if (!empty($fields)) {
            $error['fields'] = $fields;
        }

        echo json_encode([
            'success' => false,
            'error'   => $error,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
