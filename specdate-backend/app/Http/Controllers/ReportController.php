<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Services\ReportService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReportController extends Controller
{
    use ApiResponse;

    public function __construct(private ReportService $reportService)
    {
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'target_type' => ['required', 'string', Rule::in(Report::TARGETS)],
            'target_id' => 'required|integer',
            'reason' => 'required|string|max:120',
            'details' => 'nullable|string|max:2000',
        ]);
        $data['reporter_ip_address'] = (string) $request->ip();
        $data['reporter_user_agent'] = substr((string) $request->userAgent(), 0, 1000);

        try {
            $report = $this->reportService->create($request->user(), $data);
            return $this->sendResponse($report, 'Report submitted successfully.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', Rule::in(Report::STATUSES)],
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->reportService->index(
                    $request->user(),
                    $data['status'] ?? null,
                    (int) ($data['per_page'] ?? 50),
                ),
                'Reports retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function update(Request $request, Report $report)
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', Rule::in(Report::STATUSES)],
            'action' => ['nullable', 'string', Rule::in(Report::ACTIONS)],
            'action_note' => 'nullable|string|max:2000',
        ]);

        try {
            $report = $this->reportService->review($request->user(), $report, $data);
            return $this->sendResponse($report, 'Report updated successfully.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
