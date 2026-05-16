<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Spec;
use App\Models\SpecApplication;
use App\Services\BlockService;
use App\Services\PublicUserDirectoryService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use ApiResponse;

    public function __construct(
        private BlockService $blockService,
        private PublicUserDirectoryService $userDirectory,
    )
    {
    }

    /**
     * Return public profile for a user (read-only).
     * Used when viewing another user's profile (e.g. spec creator).
     * Auth required; returns only public/safe fields.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'sex' => ['nullable', 'string', 'max:32'],
            'city' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:120'],
            'query' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $users = $this->userDirectory->listForUser(
            $request->user(),
            $validated,
            (int) $request->integer('per_page', 20)
        );

        return $this->sendResponse([
            'data' => $users->items(),
            'current_page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
            'total' => $users->total(),
            'per_page' => $users->perPage(),
        ], 'Users retrieved successfully.');
    }

    public function filterOptions(Request $request)
    {
        $validated = $request->validate([
            'sex' => ['nullable', 'string', 'max:32'],
            'country' => ['nullable', 'string', 'max:120'],
            'query' => ['nullable', 'string', 'max:120'],
        ]);

        return $this->sendResponse(
            $this->userDirectory->filterOptionsForUser($request->user(), $validated),
            'User filter options retrieved successfully.'
        );
    }

    /**
     * Return public profile for a user (read-only).
     * Used when viewing another user's profile (e.g. spec creator).
     * Auth required; returns only public/safe fields.
     */
    public function show(Request $request, int $id)
    {
        $user = User::with(['profile', 'media'])->find($id);

        if (!$user) {
            return $this->sendError('User not found.', [], 404);
        }

        if ($user->is_paused) {
            return $this->sendError('User not found.', [], 404);
        }

        if ($this->blockService->hasBlockBetween((int) $request->user()->id, (int) $user->id)) {
            return $this->sendError('User not found.', [], 404);
        }

        $profile = $user->profile;
        $specsCreated = Spec::where('user_id', $id)->count();
        $specsParticipated = SpecApplication::where('user_id', $id)
            ->where('user_role', 'participant')
            ->count();
        $datesCount = 0; // placeholder: first-dates / meetups when we have that data

        $avatarMedia = $user->media->where('type', 'avatar')->whereNull('hidden_at')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first();
        $avatarUrl = $avatarMedia ? $avatarMedia->url : null;

        $public = [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'profile' => $profile ? [
                'full_name' => $profile->full_name,
                'avatar' => $avatarUrl ?? $profile->avatar ?? null,
                'city' => $profile->city,
                'state' => $profile->state,
                'country' => $profile->country,
                'country_code' => $profile->country_code,
                'dob' => $profile->dob?->format('Y-m-d'),
                'sex' => $profile->sex,
                'occupation' => $profile->occupation,
                'qualification' => $profile->qualification,
                'hobbies' => $profile->hobbies,
                'ideal_dates' => $profile->ideal_dates ?? [],
                'height' => $profile->height,
                'ethnicity' => $profile->ethnicity,
                'religion' => $profile->religion,
                'is_smoker' => $profile->is_smoker,
                'is_drug_user' => $profile->is_drug_user,
                'sexual_orientation' => $profile->sexual_orientation,
            ] : null,
            'images' => $user->media->where('type', 'profile_gallery')->whereNull('hidden_at')->filter(fn ($media) => $media->isShareable())->map(function ($media) {
                return $media->url; // Uses the getUrlAttribute accessor (ImageKit)
            })->values()->all(),
            'profile_gallery_media' => $user->media->where('type', 'profile_gallery')->whereNull('hidden_at')->filter(fn ($media) => $media->isShareable())->map(function ($media) {
                return ['id' => $media->id, 'url' => $media->url];
            })->values()->all(),
            'specs_created_count' => $specsCreated,
            'specs_participated_count' => $specsParticipated,
            'dates_count' => $datesCount,
        ];

        return $this->sendResponse($public, 'Profile retrieved successfully.');
    }
}
