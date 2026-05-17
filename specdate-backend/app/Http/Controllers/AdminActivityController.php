<?php

namespace App\Http\Controllers;

use App\Services\AdminActivityService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminActivityController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminActivityService $activity)
    {
    }

    public function index(Request $request): JsonResponse
    {
        if ($request->user()?->role !== 'admin') {
            return $this->sendError('Admin access required.', [], 403);
        }

        return $this->sendResponse([
            'items' => $this->activity->recent((int) $request->integer('limit', 25)),
            'counts' => $this->activity->counts(),
        ], 'Admin activity retrieved successfully.');
    }
}
