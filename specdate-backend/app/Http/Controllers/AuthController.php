<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\SendOtpRequest;

class AuthController extends Controller
{
    use ApiResponse;

    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return $this->sendResponse($result, 'User registered successfully.', 201);
    }

    /**
     * Send OTP to email (or mobile when SMS is configured) for registration verification.
     */
    public function sendOtp(SendOtpRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $result = $this->authService->sendOtp(
            $validated['channel'],
            $validated['target']
        );

        return $this->sendResponse($result, $result['message'] ?? 'OTP sent.');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->only('email', 'password'));

        if (!$result) {
            return $this->sendError('Unauthorised.', ['error' => 'Invalid credentials'], 401);
        }

        return $this->sendResponse($result, 'User logged in successfully.');
    }

    /**
     * Revoke the current access token (logout). Requires auth:sanctum.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->sendResponse(null, 'Logged out successfully.');
    }
}
