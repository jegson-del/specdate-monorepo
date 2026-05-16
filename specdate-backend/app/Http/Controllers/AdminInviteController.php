<?php

namespace App\Http\Controllers;

use App\Services\AdminInviteService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminInviteController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminInviteService $adminInvites) {}

    public function index(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->adminInvites->list($request->user(), $request->only(['q']), (int) $request->integer('per_page', 25)),
                'Admin invites retrieved.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:120',
            'email' => 'required|string|email|max:254|unique:users,email',
        ]);

        try {
            return $this->sendResponse($this->adminInvites->create($request->user(), $data), 'Admin invite sent.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function showPublic(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse($this->adminInvites->publicPayload((string) $request->query('token')), 'Admin invite retrieved.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string']);

        try {
            $this->adminInvites->sendOtp($data['token']);
            return $this->sendResponse(null, 'Verification code sent.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string',
            'name' => 'required|string|min:2|max:120',
            'username' => 'nullable|string|min:3|max:255|unique:users,username',
            'email' => 'required|string|email|max:254',
            'password' => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
            'otp_code' => 'required|string|size:6',
        ]);

        try {
            return $this->sendResponse($this->adminInvites->register($data['token'], $data), 'Admin registration received.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function approve(Request $request, int $invite): JsonResponse
    {
        try {
            return $this->sendResponse($this->adminInvites->approve($request->user(), $invite), 'Admin invite approved.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function revoke(Request $request, int $invite): JsonResponse
    {
        try {
            return $this->sendResponse($this->adminInvites->revoke($request->user(), $invite), 'Admin invite revoked.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
