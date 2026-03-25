<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Course;
use App\Models\Enrollment;
use App\Config\Database;
use App\Services\PhonePeService;
use App\Config\PricingPlans;
use PDO;

class PaymentController
{
    private PDO $db;
    private Course $courseModel;
    private Enrollment $enrollmentModel;
    private PhonePeService $phonePe;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->courseModel = new Course();
        $this->enrollmentModel = new Enrollment();
        $this->phonePe = new PhonePeService();
    }

    public function initiate(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = $GLOBALS['auth_user']['id'];

        if (empty($data['course_id'])) {
            Response::error('Course ID is required', 'VALIDATION_ERROR', 422);
        }

        $courseId = (int) $data['course_id'];
        $course = $this->courseModel->findById($courseId);

        if (!$course || !$course['is_published']) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        // Check if already enrolled
        if ($this->enrollmentModel->isEnrolled($userId, $courseId)) {
            Response::error('You are already enrolled in this course', 'ALREADY_ENROLLED', 400);
        }

        // For free courses, enroll directly
        if ($course['is_free'] || $course['price'] <= 0) {
            $this->enrollmentModel->create($userId, $courseId);
            Response::json(['status' => 'enrolled'], 'Enrolled in free course');
            return;
        }

        if (!$this->phonePe->isConfigured()) {
            Response::error(
                'Payment gateway is not configured. Set PHONEPE_AUTH_TOKEN (Standard Checkout v2) or PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY (classic) in backend/.env.',
                'PAYMENT_NOT_CONFIGURED',
                503
            );
        }

        $planCode = isset($data['plan_code']) ? trim((string) $data['plan_code']) : '';
        if ($planCode === '' || !PricingPlans::isValidCode($planCode)) {
            Response::error('Valid plan_code is required for paid courses', 'VALIDATION_ERROR', 422);
        }

        $amount = PricingPlans::amountFor($planCode);
        if ($amount === null) {
            Response::error('Invalid plan', 'VALIDATION_ERROR', 422);
        }

        $merchantTxnId = 'YOGA_' . $userId . '_' . $courseId . '_' . time();

        $this->insertTransactionWithOptionalPlanColumn(
            $userId,
            $courseId,
            $planCode,
            $merchantTxnId,
            $amount
        );

        $result = $this->phonePe->initiatePayment($merchantTxnId, $userId, $amount, $courseId);
        $redirectUrl = PhonePeService::extractRedirectUrl($result);

        if ($redirectUrl !== null && $redirectUrl !== '') {
            Response::json([
                'redirect_url'    => $redirectUrl,
                'merchant_txn_id' => $merchantTxnId,
            ]);
        }

        $stmt = $this->db->prepare('UPDATE transactions SET status = "failed" WHERE merchant_txn_id = :txn');
        $stmt->execute(['txn' => $merchantTxnId]);

        $isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
        $detail = PhonePeService::summarizeFailure($result);
        if ($isDev) {
            error_log('PhonePe initiate failed: ' . json_encode($result, JSON_UNESCAPED_UNICODE));
            Response::error(
                "Payment gateway error: {$detail}",
                'PAYMENT_FAILED',
                500
            );
        }

        Response::error(
            'Payment initiation failed. Please try again.',
            'PAYMENT_FAILED',
            500
        );
    }

    /**
     * @throws \PDOException
     */
    private function insertTransactionWithOptionalPlanColumn(
        int $userId,
        int $courseId,
        string $planCode,
        string $merchantTxnId,
        float $amount
    ): void {
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO transactions (user_id, course_id, plan_code, merchant_txn_id, amount, status)
                 VALUES (:user_id, :course_id, :plan_code, :merchant_txn_id, :amount, :status)'
            );
            $stmt->execute([
                'user_id'         => $userId,
                'course_id'       => $courseId,
                'plan_code'       => $planCode,
                'merchant_txn_id' => $merchantTxnId,
                'amount'          => $amount,
                'status'          => 'initiated',
            ]);
        } catch (\PDOException $e) {
            $driverCode = $e->errorInfo[1] ?? null;
            $msg        = $e->getMessage();
            if ($driverCode === 1054 || str_contains($msg, 'plan_code')) {
                $stmt = $this->db->prepare(
                    'INSERT INTO transactions (user_id, course_id, merchant_txn_id, amount, status)
                     VALUES (:user_id, :course_id, :merchant_txn_id, :amount, :status)'
                );
                $stmt->execute([
                    'user_id'         => $userId,
                    'course_id'       => $courseId,
                    'merchant_txn_id' => $merchantTxnId,
                    'amount'          => $amount,
                    'status'          => 'initiated',
                ]);

                return;
            }
            throw $e;
        }
    }

    public function callback(): void
    {
        $rawBody = file_get_contents('php://input');
        $data = json_decode($rawBody, true) ?? [];

        // Verify PhonePe signature
        $xVerify = $_SERVER['HTTP_X_VERIFY'] ?? '';
        $responseBase64 = $data['response'] ?? '';

        if ($responseBase64 && $xVerify) {
            $isValid = $this->phonePe->verifyCallback($responseBase64, $xVerify);
            if (!$isValid) {
                Response::error('Invalid signature', 'INVALID_SIGNATURE', 400);
                return;
            }

            $decoded = json_decode(base64_decode($responseBase64), true);
        } else {
            // Fallback for sandbox which may not send proper signatures
            $decoded = $data;
        }

        $merchantTxnId = $decoded['data']['merchantTransactionId'] ?? ($decoded['merchantTransactionId'] ?? null);
        $phonePeTxnId = $decoded['data']['transactionId'] ?? null;
        $status = $decoded['code'] ?? $decoded['data']['responseCode'] ?? null;

        if (!$merchantTxnId) {
            Response::error('Missing transaction ID', 'BAD_REQUEST', 400);
            return;
        }

        // Find transaction
        $stmt = $this->db->prepare('SELECT * FROM transactions WHERE merchant_txn_id = :txn LIMIT 1');
        $stmt->execute(['txn' => $merchantTxnId]);
        $txn = $stmt->fetch();

        if (!$txn) {
            Response::error('Transaction not found', 'NOT_FOUND', 404);
            return;
        }

        $isSuccess = ($status === 'PAYMENT_SUCCESS' || $status === 'SUCCESS');
        $newStatus = $isSuccess ? 'success' : 'failed';

        // Update transaction
        $stmt = $this->db->prepare(
            'UPDATE transactions SET status = :status, phonepe_txn_id = :phonepe_txn_id, phonepe_response = :response WHERE merchant_txn_id = :txn'
        );
        $stmt->execute([
            'status'         => $newStatus,
            'phonepe_txn_id' => $phonePeTxnId,
            'response'       => json_encode($decoded),
            'txn'            => $merchantTxnId,
        ]);

        // On success, create enrollment
        if ($isSuccess) {
            if (!$this->enrollmentModel->isEnrolled($txn['user_id'], $txn['course_id'])) {
                $this->enrollmentModel->create($txn['user_id'], $txn['course_id']);
            }
        }

        Response::json(null, 'Callback processed');
    }

    public function status(array $params): void
    {
        $merchantTxnId = $params['merchant_txn_id'];
        $userId = $GLOBALS['auth_user']['id'];

        $stmt = $this->db->prepare(
            'SELECT status, merchant_txn_id, course_id FROM transactions WHERE merchant_txn_id = :txn AND user_id = :uid LIMIT 1'
        );
        $stmt->execute(['txn' => $merchantTxnId, 'uid' => $userId]);
        $txn = $stmt->fetch();

        if (!$txn) {
            Response::error('Transaction not found', 'NOT_FOUND', 404);
        }

        // If still initiated/pending, check with PhonePe
        if (in_array($txn['status'], ['initiated', 'pending'])) {
            $result = $this->phonePe->checkStatus($merchantTxnId);

            if (!empty($result['success']) && !empty($result['code'])) {
                $isSuccess = ($result['code'] === 'PAYMENT_SUCCESS');
                $newStatus = $isSuccess ? 'success' : ($result['code'] === 'PAYMENT_PENDING' ? 'pending' : 'failed');

                $stmt = $this->db->prepare('UPDATE transactions SET status = :status WHERE merchant_txn_id = :txn');
                $stmt->execute(['status' => $newStatus, 'txn' => $merchantTxnId]);

                if ($isSuccess && !$this->enrollmentModel->isEnrolled($userId, $txn['course_id'])) {
                    $this->enrollmentModel->create($userId, $txn['course_id']);
                }

                $txn['status'] = $newStatus;
            }
        }

        Response::json([
            'status'          => $txn['status'],
            'merchant_txn_id' => $txn['merchant_txn_id'],
            'course_id'       => $txn['course_id'],
        ]);
    }
}
