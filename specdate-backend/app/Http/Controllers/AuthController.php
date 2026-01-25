<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;

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

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->only('email', 'password'));

        if (!$result) {
            return $this->sendError('Unauthorised.', ['error' => 'Invalid credentials'], 401);
        }

        return $this->sendResponse($result, 'User logged in successfully.');
    }
}
