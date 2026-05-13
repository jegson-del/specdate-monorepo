<?php

namespace App\Http\Controllers;

use App\Models\Media;
use App\Services\AdminMediaModerationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminMediaModerationController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminMediaModerationService $mediaModerationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => [
                'nullable',
                'string',
                Rule::in(['needs_review', 'reported', 'stale', 'pending', 'scanning', 'manual_pending', 'flagged', 'failed', 'approved', 'hidden']),
            ],
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->mediaModerationService->index(
                    $request->user(),
                    $data['status'] ?? null,
                    (int) ($data['per_page'] ?? 25)
                ),
                'Media moderation queue retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function approve(Request $request, Media $media): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->mediaModerationService->approve($request->user(), $media),
                'Media approved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
