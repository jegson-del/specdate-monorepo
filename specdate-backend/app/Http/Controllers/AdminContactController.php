<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Services\AdminContactService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminContactController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminContactService $contacts)
    {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->contacts->list(
                    $request->user(),
                    $request->query('status'),
                    (int) $request->integer('per_page', 25)
                ),
                'Contact messages retrieved.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function show(Request $request, int $ticket): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->contacts->show($request->user(), $ticket),
                'Contact thread retrieved.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function reply(Request $request, int $ticket): JsonResponse
    {
        $data = $request->validate([
            'body' => 'required|string|max:4000',
        ]);

        try {
            return $this->sendResponse(
                $this->contacts->reply($request->user(), $ticket, $data['body']),
                'Contact reply sent.',
                201
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function updateStatus(Request $request, int $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(SupportTicket::STATUSES)],
        ]);

        try {
            return $this->sendResponse(
                $this->contacts->updateStatus($request->user(), $ticket, $data['status']),
                'Contact status updated.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function destroy(Request $request, int $ticket): JsonResponse
    {
        try {
            $this->contacts->delete($request->user(), $ticket);

            return $this->sendResponse([], 'Contact message deleted.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
