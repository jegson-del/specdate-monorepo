<?php

namespace App\Http\Controllers;

use App\Services\AdminUserService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminUserController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminUserService $users)
    {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->users->index(
                    $request->user(),
                    $request->only(['q', 'role', 'status']),
                    (int) $request->integer('per_page', 25)
                ),
                'Users retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function show(Request $request, int $user): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->users->show($request->user(), $user),
                'User retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function pause(Request $request, int $user): JsonResponse
    {
        return $this->runAction(fn () => $this->users->pause($request->user(), $user), 'User paused.');
    }

    public function unpause(Request $request, int $user): JsonResponse
    {
        return $this->runAction(fn () => $this->users->unpause($request->user(), $user), 'User unpaused.');
    }

    public function ban(Request $request, int $user): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'required|string|min:3|max:2000',
        ]);

        return $this->runAction(fn () => $this->users->ban($request->user(), $user, $data['reason']), 'User banned.');
    }

    public function unban(Request $request, int $user): JsonResponse
    {
        return $this->runAction(fn () => $this->users->unban($request->user(), $user), 'User unbanned.');
    }

    public function updateNote(Request $request, int $user): JsonResponse
    {
        $data = $request->validate([
            'admin_note' => 'nullable|string|max:4000',
        ]);

        return $this->runAction(
            fn () => $this->users->updateNote($request->user(), $user, $data['admin_note'] ?? null),
            'User admin note saved.'
        );
    }

    public function updateAdminAccess(Request $request, int $user): JsonResponse
    {
        $data = $request->validate([
            'can_view_financial_vouchers' => 'required|boolean',
            'can_view_financial_credits' => 'required|boolean',
        ]);

        return $this->runAction(
            fn () => $this->users->updateAdminAccess($request->user(), $user, $data),
            'Admin access updated.'
        );
    }

    private function runAction(callable $action, string $message): JsonResponse
    {
        try {
            return $this->sendResponse($action(), $message);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
