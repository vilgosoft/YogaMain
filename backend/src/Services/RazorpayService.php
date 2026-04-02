<?php

namespace App\Services;

/**
 * Razorpay Orders API + payment signature verification.
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */
class RazorpayService
{
    private string $keyId;
    private string $keySecret;
    private string $apiBase;

    public function __construct()
    {
        $this->keyId     = trim($_ENV['RAZORPAY_KEY_ID'] ?? '');
        $this->keySecret = trim($_ENV['RAZORPAY_KEY_SECRET'] ?? '');
        $this->apiBase   = rtrim($_ENV['RAZORPAY_API_BASE'] ?? 'https://api.razorpay.com', '/');
    }

    public function isConfigured(): bool
    {
        return $this->keyId !== '' && $this->keySecret !== '';
    }

    public function getKeyId(): string
    {
        return $this->keyId;
    }

    /**
     * Razorpay receipt max length 40.
     */
    public static function receiptFromMerchantTxnId(string $merchantTxnId): string
    {
        return strlen($merchantTxnId) <= 40 ? $merchantTxnId : substr($merchantTxnId, 0, 40);
    }

    /**
     * @param array<string, string> $notes
     * @return array{success: true, order_id: string, amount: int, currency: string}|array{success: false, error: string, raw?: mixed}
     */
    public function createOrder(int $amountPaise, string $receipt, array $notes = []): array
    {
        $payload = [
            'amount'   => $amountPaise,
            'currency' => 'INR',
            'receipt'  => $receipt,
            'notes'    => $notes,
        ];

        $ch = curl_init($this->apiBase . '/v1/orders');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_USERPWD        => $this->keyId . ':' . $this->keySecret,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT        => 30,
        ]);

        $response = curl_exec($ch);
        $curlErr  = curl_error($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return ['success' => false, 'error' => $curlErr !== '' ? $curlErr : 'Could not reach Razorpay'];
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            return ['success' => false, 'error' => 'Invalid JSON from Razorpay', 'raw' => $response];
        }

        if ($httpCode < 200 || $httpCode >= 300 || empty($data['id'])) {
            $msg = $data['error']['description'] ?? $data['error']['code'] ?? 'Order creation failed';

            return ['success' => false, 'error' => is_string($msg) ? $msg : 'Order creation failed', 'raw' => $data];
        }

        return [
            'success'   => true,
            'order_id'  => (string) $data['id'],
            'amount'    => (int) $data['amount'],
            'currency'  => (string) ($data['currency'] ?? 'INR'),
        ];
    }

    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        if ($orderId === '' || $paymentId === '' || $signature === '') {
            return false;
        }
        $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, $this->keySecret);

        return hash_equals($expected, $signature);
    }
}
