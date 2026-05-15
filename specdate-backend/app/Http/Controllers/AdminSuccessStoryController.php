<?php

namespace App\Http\Controllers;

use App\Models\SuccessStory;
use App\Services\AdminSuccessStoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSuccessStoryController extends Controller
{
    public function __construct(private AdminSuccessStoryService $stories) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', Rule::in(SuccessStory::STATUSES)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return response()->json([
            'message' => 'Success stories retrieved successfully.',
            'data' => $this->stories->list(
                $request->user(),
                $data['status'] ?? null,
                (int) $request->integer('per_page', 25),
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->stories->validationRules());

        return response()->json([
            'message' => 'Success story created.',
            'data' => $this->stories->create($request->user(), $data),
        ], 201);
    }

    public function update(Request $request, int $story): JsonResponse
    {
        $data = $request->validate($this->stories->validationRules(true));

        return response()->json([
            'message' => 'Success story updated.',
            'data' => $this->stories->update($request->user(), $story, $data),
        ]);
    }

    public function destroy(Request $request, int $story): JsonResponse
    {
        $this->stories->delete($request->user(), $story);

        return response()->json(['message' => 'Success story deleted.']);
    }
}
