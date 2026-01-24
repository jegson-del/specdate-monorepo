<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    private function jsonOptions(): int
    {
        // Prevent 500s when DB contains invalid UTF-8 bytes.
        // NOTE: JSON_INVALID_UTF8_SUBSTITUTE requires PHP 7.2+ (we're on PHP 8.2+).
        return JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE;
    }

    /**
     * success response method.
     *
     * @param mixed $result
     * @param string $message
     * @param int $code
     * @return JsonResponse
     */
    public function sendResponse($result, $message = 'Success', $code = 200)
    {
        $response = [
            'success' => true,
            'data'    => $result,
            'message' => $message,
        ];

        return response()->json($response, $code, [], $this->jsonOptions());
    }

    /**
     * return error response.
     *
     * @param string $error
     * @param array $errorMessages
     * @param int $code
     * @return JsonResponse
     */
    public function sendError($error, $errorMessages = [], $code = 404)
    {
        $response = [
            'success' => false,
            'message' => $error,
        ];

        if (!empty($errorMessages)) {
            $response['data'] = $errorMessages;
        }

        return response()->json($response, $code, [], $this->jsonOptions());
    }
}
