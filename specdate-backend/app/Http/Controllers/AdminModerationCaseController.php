<?php

namespace App\Http\Controllers;

use App\Models\ModerationCase;
use App\Services\ModerationCaseService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminModerationCaseController extends Controller
{
    use ApiResponse;

    public function __construct(private ModerationCaseService $cases)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:120',
            'status' => ['nullable', 'string', Rule::in([
                ModerationCase::STATUS_OPEN,
                ModerationCase::STATUS_UNDER_REVIEW,
                ModerationCase::STATUS_ACTIONED,
                ModerationCase::STATUS_DISMISSED,
                ModerationCase::STATUS_APPEALED,
                ModerationCase::STATUS_CLOSED,
            ])],
            'source' => ['nullable', 'string', Rule::in([
                ModerationCase::SOURCE_REPORT,
                ModerationCase::SOURCE_AI_MEDIA,
                ModerationCase::SOURCE_ADMIN,
                ModerationCase::SOURCE_SYSTEM,
            ])],
            'severity' => ['nullable', 'string', Rule::in([
                ModerationCase::SEVERITY_LOW,
                ModerationCase::SEVERITY_MEDIUM,
                ModerationCase::SEVERITY_HIGH,
                ModerationCase::SEVERITY_CRITICAL,
            ])],
            'target_type' => 'nullable|string|max:80',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->cases->adminIndex($request->user(), $data, (int) ($data['per_page'] ?? 25)),
                'Moderation cases retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function show(Request $request, ModerationCase $case): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->cases->adminShow($request->user(), $case),
                'Moderation case retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function update(Request $request, ModerationCase $case): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in([
                ModerationCase::STATUS_UNDER_REVIEW,
                ModerationCase::STATUS_ACTIONED,
                ModerationCase::STATUS_DISMISSED,
                ModerationCase::STATUS_CLOSED,
            ])],
            'note' => 'nullable|string|max:2000',
        ]);

        try {
            return $this->sendResponse(
                $this->cases->updateStatus($request->user(), $case, $data['status'], $data['note'] ?? null),
                'Moderation case updated successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
