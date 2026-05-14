<?php

namespace App\Http\Controllers;

use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\User;
use App\Services\ModerationEnforcementService;
use App\Services\StrikeService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminModerationStrikeController extends Controller
{
    use ApiResponse;

    public function __construct(
        private StrikeService $strikes,
        private ModerationEnforcementService $enforcement,
    )
    {
    }

    public function issue(Request $request, ModerationCase $case): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'report_id' => 'nullable|integer|exists:reports,id',
            'category' => ['required', 'string', Rule::in(ModerationStrike::CATEGORIES)],
            'severity' => ['required', 'string', Rule::in(ModerationStrike::SEVERITIES)],
            'reason' => 'required|string|min:3|max:2000',
            'evidence' => 'nullable|array',
            'expires_at' => 'nullable|date|after:now',
        ]);

        try {
            return $this->sendResponse(
                $this->strikes->issue($request->user(), $case, $data),
                'Strike issued successfully.',
                201
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function revoke(Request $request, ModerationStrike $strike): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'required|string|min:3|max:2000',
        ]);

        try {
            return $this->sendResponse(
                $this->strikes->revoke($request->user(), $strike, $data['reason']),
                'Strike revoked successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function warning(Request $request, ModerationCase $case): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'reason' => 'required|string|min:3|max:2000',
        ]);

        try {
            return $this->sendResponse(
                $this->enforcement->warn($case, $this->subjectUser($case, $data), $request->user(), $data['reason']),
                'Warning applied successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function suspend(Request $request, ModerationCase $case): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'reason' => 'required|string|min:3|max:2000',
            'days' => 'nullable|integer|min:1|max:365',
        ]);

        try {
            return $this->sendResponse(
                $this->enforcement->temporarilySuspend(
                    $case,
                    $this->subjectUser($case, $data),
                    $request->user(),
                    $data['reason'],
                    now()->addDays((int) ($data['days'] ?? 3))
                ),
                'User suspended successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function ban(Request $request, ModerationCase $case): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'reason' => 'required|string|min:3|max:2000',
        ]);

        try {
            return $this->sendResponse(
                $this->enforcement->permanentlyBan($case, $this->subjectUser($case, $data), $request->user(), $data['reason']),
                'User banned successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    private function subjectUser(ModerationCase $case, array $data): User
    {
        $userId = (int) ($data['user_id'] ?? $case->subject_user_id);
        if ($userId <= 0) {
            throw new HttpException(422, 'A subject user is required.');
        }

        return User::query()->findOrFail($userId);
    }
}
