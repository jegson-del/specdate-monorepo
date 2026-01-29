<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    protected $service;

    public function __construct(NotificationService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 20);
        $notifications = $request->user()
            ->notifications()
            ->orderByDesc('created_at')
            ->paginate($limit);

        return response()->json($notifications);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        // specific notification or all? For now specific.
        // Ensure user owns it
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->service->markAsRead($notification);
        return response()->json(['message' => 'Marked as read']);
    }

    public function updatePushToken(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $request->user()->update([
            'expo_push_token' => $request->input('token'),
        ]);

        return response()->json(['message' => 'Token updated']);
    }
}
