<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Services\SupportService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SupportController extends Controller
{
    use ApiResponse;

    public function __construct(private SupportService $supportService)
    {
    }

    public function index(Request $request)
    {
        return $this->sendResponse($this->supportService->listTickets($request->user()), 'Support tickets retrieved.');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category' => ['required', 'string', Rule::in(SupportTicket::CATEGORIES)],
            'subject' => 'required|string|max:160',
            'message' => 'required|string|max:4000',
        ]);

        $ticket = $this->supportService->createTicket($request->user(), $data);
        return $this->sendResponse($ticket, 'Support ticket created.', 201);
    }

    public function show(Request $request, int $ticket)
    {
        try {
            return $this->sendResponse(
                $this->supportService->getTicket(
                    $request->user(),
                    $ticket,
                    $request->filled('before_id') ? (int) $request->integer('before_id') : null,
                    (int) $request->integer('per_page', 25)
                ),
                'Support ticket retrieved.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function sendMessage(Request $request, int $ticket)
    {
        $data = $request->validate([
            'body' => 'required|string|max:4000',
        ]);

        try {
            $message = $this->supportService->addMessage($request->user(), $ticket, $data['body']);
            return $this->sendResponse($this->supportService->messagePayload($message), 'Support message sent.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function markRead(Request $request, int $ticket)
    {
        try {
            $this->supportService->markRead($request->user(), $ticket);
            return $this->sendResponse([], 'Support ticket marked as read.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function update(Request $request, int $ticket)
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(SupportTicket::STATUSES)],
        ]);

        try {
            $ticket = $this->supportService->updateStatus($request->user(), $ticket, $data['status']);
            return $this->sendResponse($ticket, 'Support ticket updated.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
