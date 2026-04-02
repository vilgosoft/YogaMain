<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Course;
use App\Models\Enrollment;
use App\Config\Database;
use App\Services\RazorpayService;
use App\Config\PricingPlans;
use PDO;

class PaymentController
{
    private PDO $db;
    private Course $courseModel;
    private Enrollment $enrollmentModel;
    private RazorpayService $razorpay;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->courseModel = new Course();
        $this->enrollmentModel = new Enrollment();
        $this->razorpay = new RazorpayService();
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

        if ($this->enrollmentModel->isEnrolled($userId, $courseId)) {
            Response::error('You are already enrolled in this course', 'ALREADY_ENROLLED', 400);
        }

        $planCode = isset($data['plan_code']) ? trim((string) $data['plan_code']) : '';

        if ($planCode !== '' && !PricingPlans::isValidCode($planCode)) {
            Response::error('Invalid plan_code', 'VALIDATION_ERROR', 422);
        }

        $hasPaidPlan = $planCode !== '' && PricingPlans::isValidCode($planCode);

        if ($hasPaidPlan) {
            if (!$this->razorpay->isConfigured()) {
                Response::error(
                    'Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.',
                    'PAYMENT_NOT_CONFIGURED',
                    503
                );
            }

            $amount = PricingPlans::amountFor($planCode);
            if ($amount === null) {
                Response::error('Invalid plan', 'VALIDATION_ERROR', 422);
            }

            $merchantTxnId = sprintf(
                'YOGA_%d_%d_%d_%s',
                $userId,
                $courseId,
                time(),
                bin2hex(random_bytes(4))
            );

            $this->insertTransactionWithOptionalPlanColumn(
                $userId,
                $courseId,
                $planCode,
                $merchantTxnId,
                $amount
            );

            $amountPaise = (int) round((float) $amount * 100);
            $receipt = RazorpayService::receiptFromMerchantTxnId($merchantTxnId);

            $order = $this->razorpay->createOrder($amountPaise, $receipt, [
                'merchant_txn_id' => $merchantTxnId,
                'user_id'         => (string) $userId,
                'course_id'       => (string) $courseId,
            ]);

            if (!$order['success']) {
                $stmt = $this->db->prepare('UPDATE transactions SET status = "failed" WHERE merchant_txn_id = :txn');
                $stmt->execute(['txn' => $merchantTxnId]);

                $isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
                $detail = $order['error'] ?? 'Unknown error';
                if ($isDev) {
                    error_log('Razorpay order failed: ' . json_encode($order, JSON_UNESCAPED_UNICODE));
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

            $stmt = $this->db->prepare(
                'UPDATE transactions SET phonepe_txn_id = :oid WHERE merchant_txn_id = :txn'
            );
            $stmt->execute(['oid' => $order['order_id'], 'txn' => $merchantTxnId]);

            $userName = '';
            $nameStmt = $this->db->prepare('SELECT name FROM users WHERE id = :id LIMIT 1');
            $nameStmt->execute(['id' => $userId]);
            $row = $nameStmt->fetch();
            if ($row && !empty($row['name'])) {
                $userName = (string) $row['name'];
            }

            Response::json([
                'merchant_txn_id'   => $merchantTxnId,
                'razorpay_key_id'   => $this->razorpay->getKeyId(),
                'razorpay_order_id' => $order['order_id'],
                'amount'            => $order['amount'],
                'currency'          => $order['currency'],
                'course_title'      => (string) ($course['title'] ?? 'Course'),
                'prefill_email'     => (string) ($GLOBALS['auth_user']['email'] ?? ''),
                'prefill_name'      => $userName,
            ]);
        }

        if ((int) ($course['is_free'] ?? 0) === 1) {
            $this->enrollmentModel->ensureEnrolled($userId, $courseId);
            Response::json(['status' => 'enrolled'], 'Enrolled in free course');
            return;
        }

        Response::error('Valid plan_code is required for paid courses', 'VALIDATION_ERROR', 422);
    }

    /**
     * Confirms payment after Razorpay Checkout success (signature verified server-side).
     */
    public function verify(): void
    {
        if (!$this->razorpay->isConfigured()) {
            Response::error('Payment gateway is not configured', 'PAYMENT_NOT_CONFIGURED', 503);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = $GLOBALS['auth_user']['id'];

        $merchantTxnId = isset($data['merchant_txn_id']) ? trim((string) $data['merchant_txn_id']) : '';
        $orderId = isset($data['razorpay_order_id']) ? trim((string) $data['razorpay_order_id']) : '';
        $paymentId = isset($data['razorpay_payment_id']) ? trim((string) $data['razorpay_payment_id']) : '';
        $signature = isset($data['razorpay_signature']) ? trim((string) $data['razorpay_signature']) : '';

        if ($merchantTxnId === '' || $orderId === '' || $paymentId === '' || $signature === '') {
            Response::error('Missing payment verification fields', 'VALIDATION_ERROR', 422);
        }

        if (!$this->razorpay->verifyPaymentSignature($orderId, $paymentId, $signature)) {
            Response::error('Invalid payment signature', 'INVALID_SIGNATURE', 400);
        }

        $stmt = $this->db->prepare(
            'SELECT * FROM transactions WHERE merchant_txn_id = :txn AND user_id = :uid LIMIT 1'
        );
        $stmt->execute(['txn' => $merchantTxnId, 'uid' => $userId]);
        $txn = $stmt->fetch();

        if (!$txn) {
            Response::error('Transaction not found', 'NOT_FOUND', 404);
        }

        $storedOrderId = (string) ($txn['phonepe_txn_id'] ?? '');
        if ($storedOrderId === '' || !hash_equals($storedOrderId, $orderId)) {
            Response::error('Order does not match this transaction', 'ORDER_MISMATCH', 400);
        }

        if (($txn['status'] ?? '') === 'success') {
            Response::json([
                'status'          => 'success',
                'merchant_txn_id' => $merchantTxnId,
                'course_id'       => (int) $txn['course_id'],
            ], 'Already verified');
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE transactions SET status = :status, phonepe_txn_id = :pid, phonepe_response = :response WHERE merchant_txn_id = :txn'
        );
        $stmt->execute([
            'status'   => 'success',
            'pid'      => $paymentId,
            'response' => json_encode([
                'razorpay_order_id'   => $orderId,
                'razorpay_payment_id' => $paymentId,
            ], JSON_UNESCAPED_UNICODE),
            'txn'      => $merchantTxnId,
        ]);

        $this->enrollmentModel->ensureEnrolled($userId, (int) $txn['course_id']);

        Response::json([
            'status'          => 'success',
            'merchant_txn_id' => $merchantTxnId,
            'course_id'       => (int) $txn['course_id'],
        ], 'Payment verified');
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

        Response::json([
            'status'          => $txn['status'],
            'merchant_txn_id' => $txn['merchant_txn_id'],
            'course_id'       => $txn['course_id'],
        ]);
    }
}
