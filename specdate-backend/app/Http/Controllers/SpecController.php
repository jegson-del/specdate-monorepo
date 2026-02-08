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
        $type = $request->input('type', 'all'); // 'owned', 'joined', 'all'
        $specs = $this->specService->listMine($request->user(), $type);
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
     * Injects owner and participants' avatar URLs from media table (url column) into profile.avatar.
     */
    public function show(Request $request, $id)
    {
        // Pass user to check 'is_liked'
        $spec = $this->specService->getOne($id, $request->user('sanctum'));

        if (!$spec) {
            return $this->sendError('Spec not found.', [], 404);
        }

        $data = $spec->toArray();
        // Owner avatar from media table (url column)
        if (!empty($data['owner'])) {
            $owner = $spec->owner;
            $avatarMedia = $owner->relationLoaded('media') ? $owner->media->where('type', 'avatar')->sortByDesc('id')->first() : null;
            $avatarUrl = $avatarMedia ? $avatarMedia->url : null;
            if (!isset($data['owner']['profile'])) {
                $data['owner']['profile'] = [];
            }
            $data['owner']['profile']['avatar'] = $avatarUrl ?? ($data['owner']['profile']['avatar'] ?? null);
        }
        // Each application participant's avatar from media table
        if (!empty($data['applications'])) {
            foreach ($spec->applications as $i => $app) {
                $u = $app->user;
                if ($u && isset($data['applications'][$i]['user'])) {
                    $avatarMedia = $u->relationLoaded('media') ? $u->media->where('type', 'avatar')->sortByDesc('id')->first() : null;
                    $avatarUrl = $avatarMedia ? $avatarMedia->url : null;
                    if (!isset($data['applications'][$i]['user']['profile'])) {
                        $data['applications'][$i]['user']['profile'] = [];
                    }
                    $data['applications'][$i]['user']['profile']['avatar'] = $avatarUrl ?? ($data['applications'][$i]['user']['profile']['avatar'] ?? null);
                }
            }
        }
        // Round answers: inject avatar for each answer's user (so owner sees participant avatars)
        if (!empty($data['rounds'])) {
            foreach ($spec->rounds as $ri => $round) {
                if (empty($round->answers) || !isset($data['rounds'][$ri]['answers'])) {
                    continue;
                }
                foreach ($round->answers as $ai => $answer) {
                    $u = $answer->user;
                    if ($u && isset($data['rounds'][$ri]['answers'][$ai]['user'])) {
                        $avatarMedia = $u->relationLoaded('media') ? $u->media->where('type', 'avatar')->sortByDesc('id')->first() : null;
                        $avatarUrl = $avatarMedia ? $avatarMedia->url : null;
                        if (!isset($data['rounds'][$ri]['answers'][$ai]['user']['profile'])) {
                            $data['rounds'][$ri]['answers'][$ai]['user']['profile'] = [];
                        }
                        $data['rounds'][$ri]['answers'][$ai]['user']['profile']['avatar'] = $avatarUrl ?? ($data['rounds'][$ri]['answers'][$ai]['user']['profile']['avatar'] ?? null);
                    }
                }
            }
        }

        return $this->sendResponse($data, 'Spec retrieved successfully.');
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
    public function startRound(Request $request, $id)
    {
        $request->validate(['question' => 'required|string']);
        try {
            $round = $this->specService->startRound($request->user(), $id, $request->input('question'));
            return $this->sendResponse($round, 'Round started.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function submitAnswer(Request $request, $roundId)
    {
        $request->validate([
            'answer' => 'required|string',
            'media_id' => 'nullable|exists:media,id',
        ]);
        try {
            $answer = $this->specService->submitAnswer(
                $request->user(),
                $roundId,
                $request->input('answer'),
                $request->input('media_id')
            );
            return $this->sendResponse($answer, 'Answer submitted.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function eliminateUsers(Request $request, $roundId)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        try {
            $result = $this->specService->eliminateUsers($request->user(), $roundId, $request->input('user_ids'));
            return $this->sendResponse($result, 'Users eliminated.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function updateRound(Request $request, $roundId)
    {
        $request->validate(['question' => 'required|string']);
        try {
            $round = $this->specService->updateRound($request->user(), $roundId, $request->input('question'));
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
            return $this->sendResponse($result, 'User eliminated.');
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
