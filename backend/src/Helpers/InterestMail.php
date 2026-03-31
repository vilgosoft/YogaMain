<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Sends admin notification when a user registers interest in an upcoming course.
 */
final class InterestMail
{
    public static function notifyAdminCourseInterest(
        string $adminEmail,
        string $userName,
        string $userEmail,
        string $courseTitle
    ): void {
        if ($adminEmail === '') {
            return;
        }

        $fromName = $_ENV['MAIL_FROM_NAME'] ?? 'SAI ISHANI Yogashala';
        $fromAddr = $_ENV['MAIL_FROM'] ?? 'noreply@localhost';
        $subject  = 'Course interest: ' . $courseTitle;

        $safeTitle = htmlspecialchars($courseTitle, ENT_QUOTES, 'UTF-8');
        $safeName  = htmlspecialchars($userName, ENT_QUOTES, 'UTF-8');
        $safeEmail = htmlspecialchars($userEmail, ENT_QUOTES, 'UTF-8');

        $html = '<p>A learner registered interest in an upcoming course.</p>'
            . '<ul>'
            . '<li><strong>Course:</strong> ' . $safeTitle . '</li>'
            . '<li><strong>User:</strong> ' . $safeName . '</li>'
            . '<li><strong>Email:</strong> ' . $safeEmail . '</li>'
            . '</ul>';

        $headers = "MIME-Version: 1.0\r\n"
            . "Content-type: text/html; charset=UTF-8\r\n"
            . 'From: ' . self::encodeHeaderName($fromName) . " <{$fromAddr}>\r\n";

        $ok = @mail($adminEmail, $subject, $html, $headers);
        if (!$ok) {
            error_log('Course interest notification could not be sent via mail() to ' . $adminEmail);
        }
    }

    private static function encodeHeaderName(string $name): string
    {
        if (preg_match('/[^\x20-\x7E]/', $name)) {
            return '=?UTF-8?B?' . base64_encode($name) . '?=';
        }

        return $name;
    }
}
