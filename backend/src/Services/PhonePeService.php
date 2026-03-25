<?php

namespace App\Services;

class PhonePeService
{
    private string $merchantId;
    private string $saltKey;
    private string $saltIndex;
    private string $baseUrl;
    private string $frontendUrl;
    private string $backendUrl;

    public function __construct()
    {
        $this->merchantId  = $_ENV['PHONEPE_MERCHANT_ID'] ?? '';
        $this->saltKey     = $_ENV['PHONEPE_SALT_KEY'] ?? '';
        $this->saltIndex   = $_ENV['PHONEPE_SALT_INDEX'] ?? '1';
        $this->baseUrl     = $_ENV['PHONEPE_BASE_URL'] ?? 'https://api-preprod.phonepe.com/apis/pg-sandbox';
        $this->frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
        $this->backendUrl  = $_ENV['APP_URL'] ?? 'http://localhost:8000';
    }

    public function initiatePayment(string $merchantTxnId, int $userId, float $amount, int $courseId): array
    {
        $payload = [
            'merchantId'            => $this->merchantId,
            'merchantTransactionId' => $merchantTxnId,
            'merchantUserId'        => (string) $userId,
            'amount'                => (int) ($amount * 100), // Convert to paise
            'redirectUrl'           => "{$this->frontendUrl}/payments/callback?txn={$merchantTxnId}",
            'redirectMode'          => 'REDIRECT',
            'callbackUrl'           => "{$this->backendUrl}/api/payments/phonepe-callback",
            'paymentInstrument'     => [
                'type' => 'PAY_PAGE',
            ],
        ];

        $payloadJson = json_encode($payload);
        $base64Payload = base64_encode($payloadJson);

        $apiEndpoint = '/pg/v1/pay';
        $stringToSign = $base64Payload . $apiEndpoint . $this->saltKey;
        $sha256Hash = hash('sha256', $stringToSign);
        $xVerify = $sha256Hash . '###' . $this->saltIndex;

        $response = $this->makeRequest($apiEndpoint, [
            'request' => $base64Payload,
        ], $xVerify);

        return $response;
    }

    public function verifyCallback(string $responseBase64, string $xVerifyHeader): bool
    {
        $apiEndpoint = '/pg/v1/pay';
        $stringToSign = $responseBase64 . $apiEndpoint . $this->saltKey;
        $expectedHash = hash('sha256', $stringToSign) . '###' . $this->saltIndex;

        return hash_equals($expectedHash, $xVerifyHeader);
    }

    public function checkStatus(string $merchantTxnId): array
    {
        $apiEndpoint = "/pg/v1/status/{$this->merchantId}/{$merchantTxnId}";
        $stringToSign = $apiEndpoint . $this->saltKey;
        $sha256Hash = hash('sha256', $stringToSign);
        $xVerify = $sha256Hash . '###' . $this->saltIndex;

        $url = $this->baseUrl . $apiEndpoint;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-VERIFY: ' . $xVerify,
                'X-MERCHANT-ID: ' . $this->merchantId,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            return ['success' => false, 'code' => 'REQUEST_FAILED'];
        }

        return json_decode($response, true) ?? ['success' => false];
    }

    private function makeRequest(string $endpoint, array $body, string $xVerify): array
    {
        $url = $this->baseUrl . $endpoint;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-VERIFY: ' . $xVerify,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return ['success' => false, 'code' => 'CURL_ERROR'];
        }

        return json_decode($response, true) ?? ['success' => false];
    }
}
