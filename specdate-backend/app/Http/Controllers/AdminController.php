<?php

namespace App\Http\Controllers;

use App\Services\AdminService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminService $adminService)
    {
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            return $this->sendResponse(
                $this->adminService->login($credentials),
                'Admin verification code sent.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function verifyLoginOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'login_challenge' => 'required|string',
            'otp_code' => 'required|string|size:6',
        ]);

        try {
            return $this->sendResponse(
                $this->adminService->verifyLoginOtp($data),
                'Admin logged in successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function me(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->adminService->adminPayload($request->user()),
                'Admin retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function dashboard(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->adminService->dashboard($request->user()),
                'Admin dashboard retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function providers(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->adminService->providerApplications(
                    $request->user(),
                    $request->query('status'),
                    $request->query('q'),
                    (int) $request->integer('per_page', 25),
                    $request->query('country')
                ),
                'Provider applications retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
