<?php

namespace App\Http\Controllers;

use App\Services\AdminProviderService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminProviderController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminProviderService $providers)
    {
    }

    public function show(Request $request, int $provider): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->providers->show($request->user(), $provider),
                'Provider application retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function approve(Request $request, int $provider): JsonResponse
    {
        try {
            $result = $this->providers->approve($request->user(), $provider);

            return $this->sendResponse(
                $result,
                $result['setup_email_sent']
                    ? 'Provider approved and password setup email sent.'
                    : 'Provider approved, but password setup email could not be sent. Please retry sending the setup email.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function reject(Request $request, int $provider): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'required|string|min:3|max:2000',
            'admin_note' => 'nullable|string|max:4000',
        ]);

        try {
            return $this->sendResponse(
                $this->providers->reject($request->user(), $provider, $data),
                'Provider application rejected.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function updateNote(Request $request, int $provider): JsonResponse
    {
        $data = $request->validate([
            'admin_note' => 'nullable|string|max:4000',
        ]);

        try {
            return $this->sendResponse(
                $this->providers->updateNote($request->user(), $provider, $data['admin_note'] ?? null),
                'Provider admin note saved.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function resendSetupEmail(Request $request, int $provider): JsonResponse
    {
        try {
            $sent = $this->providers->resendSetupEmail($request->user(), $provider);

            return $this->sendResponse(
                ['setup_email_sent' => $sent],
                $sent ? 'Provider setup email resent.' : 'Provider setup email could not be sent.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
