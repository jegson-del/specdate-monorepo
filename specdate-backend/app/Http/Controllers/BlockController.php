<?php

namespace App\Http\Controllers;

use App\Services\BlockService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BlockController extends Controller
{
    use ApiResponse;

    public function __construct(private BlockService $blockService)
    {
    }

    public function index(Request $request)
    {
        return $this->sendResponse(
            ['blocked_user_ids' => $this->blockService->blockedIdsFor($request->user())],
            'Blocked users retrieved successfully.'
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $block = $this->blockService->block($request->user(), (int) $data['user_id'], $data['reason'] ?? null);
            return $this->sendResponse($block, 'User blocked successfully.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function destroy(Request $request, int $user)
    {
        $this->blockService->unblock($request->user(), $user);
        return $this->sendResponse([], 'User unblocked successfully.');
    }
}
