<?php

namespace App\Http\Controllers;

use App\Services\AdminManagementService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminManagementController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminManagementService $adminManagement)
    {
    }

    public function admins(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->adminManagement->admins(
                    $request->user(),
                    $request->only(['q']),
                    (int) $request->integer('per_page', 25)
                ),
                'Admins retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function permissions(Request $request): JsonResponse
    {
        try {
            return $this->sendResponse(
                $this->adminManagement->permissions($request->user()),
                'Admin access permissions retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function updateAccess(Request $request, int $admin): JsonResponse
    {
        $data = $request->validate($this->adminManagement->accessValidationRules());

        try {
            return $this->sendResponse(
                $this->adminManagement->updateAccess($request->user(), $admin, $data),
                'Admin access updated.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
