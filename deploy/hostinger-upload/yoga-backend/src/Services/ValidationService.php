<?php

namespace App\Services;

class ValidationService
{
    private array $errors = [];

    public function validate(array $data, array $rules): bool
    {
        $this->errors = [];

        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;

            foreach ($fieldRules as $rule) {
                $ruleName = is_string($rule) ? $rule : $rule[0];
                $ruleParam = is_array($rule) ? ($rule[1] ?? null) : null;

                $error = $this->applyRule($field, $value, $ruleName, $ruleParam);
                if ($error) {
                    $this->errors[$field] = $error;
                    break; // One error per field
                }
            }
        }

        return empty($this->errors);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    private function applyRule(string $field, mixed $value, string $rule, mixed $param): ?string
    {
        $label = ucfirst(str_replace('_', ' ', $field));

        switch ($rule) {
            case 'required':
                $empty = $value === null || $value === ''
                    || (is_string($value) && trim($value) === '');
                if ($empty) {
                    return "{$label} is required";
                }
                break;

            case 'email':
                if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    return "Invalid email address";
                }
                break;

            case 'min':
                if ($value && strlen($value) < $param) {
                    return "{$label} must be at least {$param} characters";
                }
                break;

            case 'max':
                if ($value && strlen($value) > $param) {
                    return "{$label} must not exceed {$param} characters";
                }
                break;

            case 'phone':
                if ($value && !preg_match('/^[6-9]\d{9}$/', $value)) {
                    return "Invalid Indian phone number";
                }
                break;

            case 'numeric':
                $v = is_string($value) ? trim($value) : $value;
                if ($v !== null && $v !== '' && !is_numeric($v)) {
                    return "{$label} must be a number";
                }
                break;

            case 'in':
                if ($value && !in_array($value, $param, true)) {
                    return "{$label} must be one of: " . implode(', ', $param);
                }
                break;

            case 'slug':
                $s = is_string($value) ? trim($value) : $value;
                if ($s !== null && $s !== '' && !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', (string) $s)) {
                    return "{$label} must be a valid URL slug";
                }
                break;
        }

        return null;
    }
}
