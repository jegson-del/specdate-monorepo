<?php

namespace App\Http\Controllers;

use App\Models\ModerationAppeal;
use App\Services\AppealService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ModerationAppealController extends Controller
{
    use ApiResponse;

    public function __construct(private AppealService $appeals)
    {
    }

    public function status(Request $request): JsonResponse
    {
        return $this->sendResponse(
            $this->appeals->moderationStatus($request->user()),
            'Moderation status retrieved successfully.'
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'case_id' => 'required_without:action_id|nullable|integer|exists:moderation_cases,id',
            'action_id' => 'required_without:case_id|nullable|integer|exists:moderation_actions,id',
            'appeal_text' => 'required|string|min:10|max:4000',
        ]);

        try {
            return $this->sendResponse(
                $this->appeals->submit($request->user(), $data),
                'Appeal submitted successfully.',
                201
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', Rule::in([
                ModerationAppeal::STATUS_OPEN,
                ModerationAppeal::STATUS_UNDER_REVIEW,
                ModerationAppeal::STATUS_GRANTED,
                ModerationAppeal::STATUS_DENIED,
                ModerationAppeal::STATUS_CLOSED,
            ])],
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->appeals->index($request->user(), $data, (int) ($data['per_page'] ?? 20)),
                'Appeals retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function adminUpdate(Request $request, ModerationAppeal $appeal): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(ModerationAppeal::DECISION_STATUSES)],
            'decision_note' => 'required|string|min:3|max:4000',
        ]);

        try {
            return $this->sendResponse(
                $this->appeals->decide($request->user(), $appeal, $data),
                'Appeal decision saved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
