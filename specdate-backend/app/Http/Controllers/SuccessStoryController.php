<?php

namespace App\Http\Controllers;

use App\Services\PublicSuccessStoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuccessStoryController extends Controller
{
    public function __construct(
        private PublicSuccessStoryService $stories,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Success stories retrieved successfully.',
            'data' => $this->stories->published((int) $request->integer('per_page', 6)),
        ]);
    }
}
