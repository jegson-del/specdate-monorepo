<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    use ApiResponse;

    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Name is no longer collected on the first registration screen.
            // We default it to username in AuthService.
            'name' => 'nullable|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'mobile' => 'required|string|max:20|unique:users',
            'password' => 'required|string|min:8',
            // Optional location fields (sent from mobile via expo-location reverse geocode)
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'continent' => 'nullable|string|max:255',
        ]);

        $result = $this->authService->register($validated);

        return $this->sendResponse($result, 'User registered successfully.', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $result = $this->authService->login($request->only('email', 'password'));

        if (!$result) {
            return $this->sendError('Unauthorised.', ['error' => 'Invalid credentials'], 401);
        }

        return $this->sendResponse($result, 'User logged in successfully.');
    }
}
