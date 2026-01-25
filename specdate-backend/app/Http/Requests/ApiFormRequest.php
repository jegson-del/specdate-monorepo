<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Base API request that returns consistent JSON validation errors.
 */
abstract class ApiFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function failedValidation(Validator $validator): void
    {
        // Match our API response shape and avoid UTF-8 JSON encoding issues.
        $payload = [
            'success' => false,
            'message' => 'Validation error.',
            'data' => [
                'errors' => $validator->errors(),
            ],
        ];

        throw new HttpResponseException(
            response()->json(
                $payload,
                422,
                [],
                JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
            )
        );
    }
}

