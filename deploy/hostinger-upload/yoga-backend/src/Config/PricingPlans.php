<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Standard course pricing (same for all paid courses).
 * Keep in sync with frontend `src/utils/pricingPlans.ts`.
 */
final class PricingPlans
{
    public const PLANS = [
        '1y_no_diet' => [
            'amount' => 3000.0,
            'title'  => '1-Year Plan',
            'option' => 'Without diet',
        ],
        '1y_diet' => [
            'amount' => 4000.0,
            'title'  => '1-Year Plan',
            'option' => 'With diet',
        ],
    ];

    public static function amountFor(string $code): ?float
    {
        return isset(self::PLANS[$code]) ? (float) self::PLANS[$code]['amount'] : null;
    }

    public static function isValidCode(string $code): bool
    {
        return isset(self::PLANS[$code]);
    }
}
