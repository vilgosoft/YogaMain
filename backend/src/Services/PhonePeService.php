<?php

namespace App\Services;

/**
 * PhonePe integration:
 * - Standard Checkout v2: set PHONEPE_AUTH_TOKEN (O-Bearer JWT from PhonePe Business dashboard).
 * - Classic PG v1: set PHONEPE_MERCHANT_ID + PHONEPE_SALT_KEY and PHONEPE_BASE_URL (…/pg-sandbox).
 */
class PhonePeService
{
    private string $merchantId;
    private string $saltKey;
    private string $saltIndex;
    private string $baseUrl;
    private string $frontendUrl;
    private string $backendUrl;
    private string $authToken;
    private string $checkoutV2Url;

    public function __construct()
    {
        $this->merchantId    = $_ENV['PHONEPE_MERCHANT_ID'] ?? '';
        $this->saltKey       = $_ENV['PHONEPE_SALT_KEY'] ?? '';
        $this->saltIndex     = $_ENV['PHONEPE_SALT_INDEX'] ?? '1';
        $this->baseUrl       = rtrim($_ENV['PHONEPE_BASE_URL'] ?? 'https://api-preprod.phonepe.com/apis/pg-sandbox', '/');
        $this->frontendUrl   = rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173', '/');
        $this->backendUrl    = rtrim($_ENV['APP_URL'] ?? 'http://localhost:8000', '/');
        $this->authToken     = trim($_ENV['PHONEPE_AUTH_TOKEN'] ?? '');
        $this->checkoutV2Url = rtrim(
            $_ENV['PHONEPE_CHECKOUT_V2_URL'] ?? 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
            '/'
        );
    }

    public function isConfigured(): bool
    {
        if ($this->authToken !== '') {
            return true;
        }

        return $this->merchantId !== '' && $this->saltKey !== '';
    }

    /** Resolve redirect URL from classic v1 or Standard Checkout v2 responses. */
    public static function extractRedirectUrl(array $response): ?string
    {
        $candidates = [
            $response['redirectUrl'] ?? null,
            $response['data']['redirectUrl'] ?? null,
            $response['data']['instrumentResponse']['redirectInfo']['url'] ?? null,
            $response['data']['instrumentResponse']['redirectInfo']['targetUrl'] ?? null,
        ];
        foreach ($candidates as $url) {
            if (is_string($url) && $url !== '') {
                return $url;
            }
        }

        return self::findRedirectUrlDeep($response, 0);
    }

    /** Fallback if redirectUrl is nested (bounded depth; key must be redirectUrl). */
    private static function findRedirectUrlDeep(mixed $node, int $depth): ?string
    {
        if ($depth > 6 || !is_array($node)) {
            return null;
        }
        foreach ($node as $key => $val) {
            if (
                $key === 'redirectUrl'
                && is_string($val)
                && $val !== ''
                && (str_starts_with($val, 'http://') || str_starts_with($val, 'https://'))
            ) {
                return $val;
            }
            if (is_array($val)) {
                $found = self::findRedirectUrlDeep($val, $depth + 1);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }

    public static function summarizeFailure(array $result): string
    {
        if (!empty($result['message']) && is_string($result['message'])) {
            return $result['message'];
        }
        if (!empty($result['code']) && is_string($result['code'])) {
            return $result['code'];
        }

        return 'Unknown error from payment gateway';
    }

    public function initiatePayment(string $merchantTxnId, int $userId, float $amount, int $courseId): array
    {
        if ($this->authToken !== '') {
            return $this->initiateCheckoutV2($merchantTxnId, $amount);
        }

        return $this->initiateCheckoutV1($merchantTxnId, $userId, $amount, $courseId);
    }

    private function initiateCheckoutV2(string $merchantTxnId, float $amount): array
    {
        $amountPaise = (int) round($amount * 100);
        if ($amountPaise < 100) {
            return ['success' => false, 'code' => 'INVALID_AMOUNT', 'message' => 'Amount must be at least ₹1'];
        }

        $redirectAfterPay = $this->frontendUrl . '/payments/callback?txn=' . rawurlencode($merchantTxnId);

        $body = [
            'merchantOrderId' => $merchantTxnId,
            'amount'          => $amountPaise,
            'paymentFlow'     => [
                'type'         => 'PG_CHECKOUT',
                'merchantUrls' => [
                    'redirectUrl' => $redirectAfterPay,
                ],
            ],
        ];

        $ch = curl_init($this->checkoutV2Url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: O-Bearer ' . $this->authToken,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return ['success' => false, 'code' => 'CURL_ERROR', 'message' => 'Could not reach PhonePe'];
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            return [
                'success'    => false,
                'code'       => 'BAD_RESPONSE',
                'message'    => 'Invalid JSON from PhonePe',
                '_http_code' => $httpCode,
                '_raw'       => substr((string) $response, 0, 500),
            ];
        }

        $decoded['_http_code'] = $httpCode;

        if ($httpCode < 200 || $httpCode >= 300) {
            $decoded['success'] = false;

            return $decoded;
        }

        if (!empty($decoded['redirectUrl'])) {
            $decoded['success'] = true;
        }

        return $decoded;
    }

    private function initiateCheckoutV1(string $merchantTxnId, int $userId, float $amount, int $courseId): array
    {
        $payload = [
            'merchantId'            => $this->merchantId,
            'merchantTransactionId' => $merchantTxnId,
            'merchantUserId'        => (string) $userId,
            'amount'                => (int) round($amount * 100),
            'redirectUrl'           => "{$this->frontendUrl}/payments/callback?txn=" . rawurlencode($merchantTxnId),
            'redirectMode'          => 'REDIRECT',
            'callbackUrl'           => "{$this->backendUrl}/api/payments/phonepe-callback",
            'paymentInstrument'     => [
                'type' => 'PAY_PAGE',
            ],
        ];

        $payloadJson     = json_encode($payload);
        $base64Payload   = base64_encode($payloadJson);
        $apiEndpoint     = '/pg/v1/pay';
        $stringToSign    = $base64Payload . $apiEndpoint . $this->saltKey;
        $sha256Hash      = hash('sha256', $stringToSign);
        $xVerify         = $sha256Hash . '###' . $this->saltIndex;

        return $this->makeRequest($apiEndpoint, [
            'request' => $base64Payload,
        ], $xVerify);
    }

    public function verifyCallback(string $responseBase64, string $xVerifyHeader): bool
    {
        $apiEndpoint  = '/pg/v1/pay';
        $stringToSign = $responseBase64 . $apiEndpoint . $this->saltKey;
        $expectedHash = hash('sha256', $stringToSign) . '###' . $this->saltIndex;

        return hash_equals($expectedHash, $xVerifyHeader);
    }

    public function checkStatus(string $merchantTxnId): array
    {
        $apiEndpoint  = "/pg/v1/status/{$this->merchantId}/{$merchantTxnId}";
        $stringToSign = $apiEndpoint . $this->saltKey;
        $sha256Hash   = hash('sha256', $stringToSign);
        $xVerify      = $sha256Hash . '###' . $this->saltIndex;

        $url = $this->baseUrl . $apiEndpoint;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-VERIFY: ' . $xVerify,
                'X-MERCHANT-ID: ' . $this->merchantId,
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            return ['success' => false, 'code' => 'REQUEST_FAILED', '_http_code' => $httpCode];
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
                'X-MERCHANT-ID: ' . $this->merchantId,
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return ['success' => false, 'code' => 'CURL_ERROR', 'message' => 'Could not reach PhonePe'];
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            return [
                'success'    => false,
                'code'       => 'BAD_RESPONSE',
                'message'    => 'Invalid JSON from PhonePe',
                '_http_code' => $httpCode,
            ];
        }

        $decoded['_http_code'] = $httpCode;

        if ($httpCode < 200 || $httpCode >= 300) {
            $decoded['success'] = false;
        }

        return $decoded;
    }
}
