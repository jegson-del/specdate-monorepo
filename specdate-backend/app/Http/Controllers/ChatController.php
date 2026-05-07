<?php

namespace App\Http\Controllers;

use App\Services\ChatService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ChatController extends Controller
{
    use ApiResponse;

    public function __construct(private ChatService $chatService)
    {
    }

    public function index(Request $request)
    {
        $threads = $this->chatService->listThreads($request->user());
        return $this->sendResponse($threads, 'Chats retrieved successfully.');
    }

    public function show(Request $request, int $thread)
    {
        try {
            $payload = $this->chatService->getThread($request->user(), $thread);
            return $this->sendResponse($payload, 'Chat retrieved successfully.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function sendMessage(Request $request, int $thread)
    {
        $request->validate([
            'body' => 'nullable|string|required_without:media_id',
            'media_id' => 'nullable|exists:media,id',
        ]);

        try {
            $message = $this->chatService->sendMessage(
                $request->user(),
                $thread,
                $request->input('body'),
                $request->input('media_id')
            );

            return $this->sendResponse($this->chatService->messagePayload($message), 'Message sent.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function markRead(Request $request, int $thread)
    {
        try {
            $this->chatService->markThreadRead($request->user(), $thread);
            return $this->sendResponse([], 'Chat marked as read.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
