<?php

namespace App\Http\Controllers;

use App\Services\AccountService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected AccountService $accountService
    ) {
    }

    /**
     * Pause the authenticated user's account. Profile is hidden; user can still log in.
     */
    public function pause(Request $request): JsonResponse
    {
        $this->accountService->pause($request->user());
        return $this->sendResponse(['is_paused' => true], 'Account paused successfully.');
    }

    /**
     * Unpause the authenticated user's account.
     */
    public function unpause(Request $request): JsonResponse
    {
        $this->accountService->unpause($request->user());
        return $this->sendResponse(['is_paused' => false], 'Account unpaused successfully.');
    }

    /**
     * Permanently delete the authenticated user's account.
     */
    public function delete(Request $request): JsonResponse
    {
        $this->accountService->deleteAccount($request->user());
        return $this->sendResponse(null, 'Account deleted successfully.');
    }
}
