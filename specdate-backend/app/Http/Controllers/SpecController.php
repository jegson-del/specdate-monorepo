<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExtendSpecSearchRequest;
use App\Http\Requests\SpecRoundUserListRequest;
use App\Http\Requests\StartSpecRoundRequest;
use App\Http\Requests\StoreSpecRequest;
use App\Http\Requests\SubmitSpecRoundAnswerRequest;
use App\Http\Requests\UpdateSpecRequest;
use App\Http\Requests\UpdateSpecRoundRequest;
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
        $type = $request->input('type', 'all'); // 'owned', 'joined', 'all'
        $specs = $this->specService->listMine($request->user(), $type);
        return $this->sendResponse($specs, 'My specs retrieved successfully.');
    }

    public function myDates(Request $request)
    {
        $dates = $this->specService->listDatesForUser($request->user(), (int) $request->integer('per_page', 20));
        return $this->sendResponse($dates, 'Dates retrieved successfully.');
    }

    /**
     * Store a newly created spec in storage.
     */
    public function store(StoreSpecRequest $request)
    {
        try {
            $spec = $this->specService->createSpec($request->validated(), $request->user());
            return $this->sendResponse($spec, 'Spec created successfully.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        } catch (\Exception $e) {
            // Logged in service
            return $this->sendError('Failed to create spec.', [], 500);
        }
    }

    public function show(Request $request, $id)
    {
        $data = $this->specService->getOnePayload($id, $request->user('sanctum'));

        if (!$data) {
            return $this->sendError('Spec not found.', [], 404);
        }

        return $this->sendResponse($data, 'Spec retrieved successfully.');
    }

    public function update(UpdateSpecRequest $request, $id)
    {
        try {
            $spec = $this->specService->updateSpec($request->user(), $id, $request->validated());
            return $this->sendResponse($spec, 'Spec updated successfully.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
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
            $result = $this->specService->join($request->user(), $id);
            return $this->sendResponse($result, 'Application sent successfully.');
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
            $result = $this->specService->eliminateApplication($request->user(), $id, $applicationId);
            return $this->sendResponse($result, $result['message'] ?? 'Participant eliminated.');
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
    public function startRound(StartSpecRoundRequest $request, $id)
    {
        try {
            $round = $this->specService->startRound(
                $request->user(),
                $id,
                $request->question(),
                $request->mediaId()
            );
            return $this->sendResponse($round, 'Round started.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function submitAnswer(SubmitSpecRoundAnswerRequest $request, $roundId)
    {
        try {
            $answer = $this->specService->submitAnswer(
                $request->user(),
                $roundId,
                $request->answerText(),
                $request->mediaId()
            );
            return $this->sendResponse($answer, 'Answer submitted.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function eliminateUsers(SpecRoundUserListRequest $request, $roundId)
    {
        try {
            $result = $this->specService->eliminateUsers($request->user(), $roundId, $request->userIds());
            return $this->sendResponse($result, 'Users eliminated.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function nudgeUsers(SpecRoundUserListRequest $request, $roundId)
    {
        try {
            $result = $this->specService->nudgeUsers($request->user(), $roundId, $request->userIds());
            return $this->sendResponse($result, 'Users nudged.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function updateRound(UpdateSpecRoundRequest $request, $roundId)
    {
        try {
            $round = $this->specService->updateRound($request->user(), $roundId, $request->question());
            return $this->sendResponse($round, 'Round updated.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function closeRound(Request $request, $roundId)
    {
        try {
            $round = $this->specService->closeRound($request->user(), $roundId);
            return $this->sendResponse($round, 'Round closed for review.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function eliminateUser(Request $request, $roundId, $userId)
    {
        try {
            $result = $this->specService->eliminateUser($request->user(), $roundId, $userId);
            return $this->sendResponse($result, $result['message'] ?? 'User eliminated.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function createDate(Request $request, $id)
    {
        try {
            $result = $this->specService->createDate($request->user(), $id);
            return $this->sendResponse($result, $result['message'] ?? 'Date created successfully.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function scheduleFollowUpDate(Request $request, int $date)
    {
        try {
            $result = $this->specService->scheduleFollowUpDate($request->user(), $date);
            return $this->sendResponse($result, $result['message'] ?? 'Date scheduled successfully.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function extendSearch(ExtendSpecSearchRequest $request, $id)
    {
        try {
            $result = $this->specService->extendSearch($request->user(), $id, $request->comment(), $request->durationDays());
            return $this->sendResponse($result, $result['message'] ?? 'Search extended.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function pendingRequests(Request $request)
    {
        return response()->json([
            'data' => $this->specService->getPendingRequests($request->user())
        ]);
    }
}
