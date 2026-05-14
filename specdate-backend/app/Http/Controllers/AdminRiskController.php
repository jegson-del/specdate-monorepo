<?php

namespace App\Http\Controllers;

use App\Models\IpRiskEvent;
use App\Models\User;
use App\Services\AdminRiskService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminRiskController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminRiskService $risk)
    {
    }

    public function users(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:120',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->risk->users($request->user(), $data, (int) ($data['per_page'] ?? 25)),
                'Risk users retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function ipEvents(Request $request): JsonResponse
    {
        $data = $request->validate([
            'event_type' => ['nullable', 'string', Rule::in([
                IpRiskEvent::EVENT_REPORT_RATE_LIMIT,
                IpRiskEvent::EVENT_APPEAL_RATE_LIMIT,
                IpRiskEvent::EVENT_FALSE_REPORT_PATTERN,
            ])],
            'severity' => ['nullable', 'string', Rule::in([
                IpRiskEvent::SEVERITY_LOW,
                IpRiskEvent::SEVERITY_MEDIUM,
                IpRiskEvent::SEVERITY_HIGH,
            ])],
            'ip' => 'nullable|string|max:45',
            'user_id' => 'nullable|integer|exists:users,id',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->risk->ipEvents($request->user(), $data, (int) ($data['per_page'] ?? 25)),
                'IP risk events retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function user(Request $request, User $user): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->risk->userRisk($request->user(), $user),
                'User risk retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
