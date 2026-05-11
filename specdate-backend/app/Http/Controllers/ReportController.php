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

        try {
            $report = $this->reportService->create($request->user(), $data);
            return $this->sendResponse($report, 'Report submitted successfully.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return $this->sendError('Admin access required.', [], 403);
        }

        $status = $request->input('status');
        $perPage = max(1, min((int) $request->integer('per_page', 50), 100));
        $reports = Report::query()
            ->with(['reporter:id,name,username', 'reportedUser:id,name,username', 'reviewer:id,name,username'])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest()
            ->paginate($perPage);

        return $this->sendResponse($reports, 'Reports retrieved successfully.');
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
