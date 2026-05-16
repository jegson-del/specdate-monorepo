<?php

namespace App\Http\Controllers;

use App\Services\ProviderInviteService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProviderInviteController extends Controller
{
    use ApiResponse;

    public function __construct(private ProviderInviteService $providerInvites) {}

    public function index(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->providerInvites->list($request->user(), $request->only(['q']), (int) $request->integer('per_page', 25)),
                'Provider invites retrieved.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_name' => 'required|string|min:2|max:120',
            'email' => 'required|string|email|max:254',
            'service_type' => 'nullable|string|in:hotel,spa,restaurant,venue,experience,other',
            'personal_message' => 'nullable|string|max:1000',
        ]);

        try {
            return $this->sendResponse($this->providerInvites->create($request->user(), $data), 'Provider invite sent.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function showPublic(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse($this->providerInvites->publicPayload((string) $request->query('token')), 'Provider invite retrieved.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function revoke(Request $request, int $invite): JsonResponse
    {
        try {
            return $this->sendResponse($this->providerInvites->revoke($request->user(), $invite), 'Provider invite revoked.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
