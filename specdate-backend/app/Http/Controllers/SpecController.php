<?php

namespace App\Http\Controllers;

use App\Models\Spec;
use App\Http\Requests\StoreSpecRequest;
use App\Services\SpecService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecController extends Controller
{
    use ApiResponse;

    protected $specService;

    public function __construct(SpecService $specService)
    {
        $this->specService = $specService;
    }

    /**
     * List Specs
     * 
     * Display a listing of specs available in the feed.
     * 
     * @group Specs
     * @queryParam filter string Filter by type: LIVE, POPULAR, HOTTEST, ONGOING. Defaults to LIVE. Example: LIVE
     * @queryParam exclude_own boolean If true, excludes specs created by the current user. Defaults to false. Example: true
     */
    public function index(Request $request)
    {
        $filter = $request->input('filter', 'LIVE'); // LIVE, POPULAR, HOTTEST, ONGOING
        $excludeOwn = $request->boolean('exclude_own', false);
        $specs = $this->specService->listForFeed($request->user(), $filter, $excludeOwn);
        return $this->sendResponse($specs, 'Specs retrieved successfully.');
    }

    /**
     * List My Specs
     * 
     * Display a listing of the authenticated user's created and joined specs.
     * 
     * @group Specs
     */
    public function mySpecs(Request $request)
    {
        $specs = $this->specService->listMine($request->user());
        return $this->sendResponse($specs, 'My specs retrieved successfully.');
    }

    /**
     * Store a newly created spec in storage.
     */
    public function store(StoreSpecRequest $request)
    {
        try {
            $spec = $this->specService->createSpec($request->validated(), $request->user());
            return $this->sendResponse($spec, 'Spec created successfully.', 201);
        } catch (\Exception $e) {
            // Logged in service
            return $this->sendError('Failed to create spec.', [], 500);
        }
    }

    /**
     * Display the specified spec.
     */
    /**
     * Display the specified spec.
     */
    public function show(Request $request, $id)
    {
        // Pass user to check 'is_liked'
        $spec = $this->specService->getOne($id, $request->user('sanctum'));

        if (!$spec) {
            return $this->sendError('Spec not found.', [], 404);
        }

        return $this->sendResponse($spec, 'Spec retrieved successfully.');
    }

    /**
     * Join Spec
     * 
     * Join a spec as a participant. Creates a PENDING application.
     * 
     * @group Applications
     * @urlParam id string required The ID of the spec to join. Example: 1
     */
    public function join(Request $request, $id)
    {
        try {
            $this->specService->join($request->user(), $id);
            return $this->sendResponse([], 'Application sent successfully.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    /**
     * Approve Application
     * 
     * Approve a pending application (Owner only).
     * 
     * @group Applications
     * @urlParam id string required The ID of the spec. Example: 1
     * @urlParam applicationId string required The ID of the application to approve. Example: 5
     */
    public function approveApplication(Request $request, $id, $applicationId)
    {
        try {
            $this->specService->approveApplication($request->user(), $id, $applicationId);
            return $this->sendResponse([], 'Application approved.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    /**
     * Reject Application
     * 
     * Reject a pending application (Owner only).
     * 
     * @group Applications
     * @urlParam id string required The ID of the spec. Example: 1
     * @urlParam applicationId string required The ID of the application to reject. Example: 5
     */
    public function rejectApplication(Request $request, $id, $applicationId)
    {
        try {
            $this->specService->rejectApplication($request->user(), $id, $applicationId);
            return $this->sendResponse([], 'Application rejected.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    /**
     * Eliminate Application
     * 
     * Eliminate a participant from the spec (Owner only).
     * 
     * @group Applications
     * @urlParam id string required The ID of the spec. Example: 1
     * @urlParam applicationId string required The ID of the application to eliminate. Example: 5
     */
    public function eliminateApplication(Request $request, $id, $applicationId)
    {
        try {
            $this->specService->eliminateApplication($request->user(), $id, $applicationId);
            return $this->sendResponse([], 'Participant eliminated.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    /**
     * Toggle Like
     * 
     * Toggle like on a spec.
     * 
     * @group Specs
     * @urlParam id string required The ID of the spec to like. Example: 1
     */
    public function toggleLike(Request $request, $id)
    {
        try {
            $result = $this->specService->toggleLike($request->user(), $id);
            return $this->sendResponse($result, 'Like toggled.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
