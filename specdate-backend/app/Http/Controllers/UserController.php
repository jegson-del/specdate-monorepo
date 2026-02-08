<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Spec;
use App\Models\SpecApplication;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Return public profile for a user (read-only).
     * Used when viewing another user's profile (e.g. spec creator).
     * Auth required; returns only public/safe fields.
     */
    public function index(Request $request)
    {
        $query = User::with(['profile', 'media'])
            ->where('id', '!=', $request->user()->id)
            ->where('is_paused', false);

        // Filter by Sex
        if ($request->has('sex') && $request->sex !== 'All') {
            $query->whereHas('profile', function ($q) use ($request) {
                $q->where('sex', $request->sex);
            });
        }

        // Filter by City (exact or partial)
        if ($request->has('city')) {
            $city = $request->city;
            $query->whereHas('profile', function ($q) use ($city) {
                $q->where('city', 'like', "%{$city}%");
            });
        }

        // Search Query (Name, City, Occupation)
        if ($request->has('query')) {
            $search = $request->input('query');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('profile', function ($pq) use ($search) {
                      $pq->where('full_name', 'like', "%{$search}%")
                         ->orWhere('city', 'like', "%{$search}%")
                         ->orWhere('occupation', 'like', "%{$search}%");
                  });
            });
        }

        $users = $query->paginate(20);

        // Format for public display
        $data = $users->getCollection()->map(function ($user) {
            $profile = $user->profile;
            $avatarMedia = $user->media->where('type', 'avatar')->sortByDesc('id')->first();
            $avatarUrl = $avatarMedia ? $avatarMedia->url : null;

            return [
                'id' => $user->id,
                'name' => $profile->full_name ?? $user->name, // Prefer full name
                'age' => $profile && $profile->dob ? $profile->dob->age : null,
                'city' => $profile->city ?? 'Unknown',
                'occupation' => $profile->occupation ?? '',
                'avatar' => $avatarUrl ?? $profile->avatar ?? null,
                'sex' => $profile->sex ?? null,
            ];
        });

        return $this->sendResponse([
            'data' => $data,
            'current_page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
            'total' => $users->total(),
        ], 'Users retrieved successfully.');
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

        $profile = $user->profile;
        $specsCreated = Spec::where('user_id', $id)->count();
        $specsParticipated = SpecApplication::where('user_id', $id)
            ->where('user_role', 'participant')
            ->count();
        $datesCount = 0; // placeholder: first-dates / meetups when we have that data

        $avatarMedia = $user->media->where('type', 'avatar')->sortByDesc('id')->first();
        $avatarUrl = $avatarMedia ? $avatarMedia->url : null;

        $public = [
            'id' => $user->id,
            'name' => $user->name,
            'profile' => $profile ? [
                'full_name' => $profile->full_name,
                'avatar' => $avatarUrl ?? $profile->avatar ?? null,
                'city' => $profile->city,
                'state' => $profile->state,
                'country' => $profile->country,
                'dob' => $profile->dob?->format('Y-m-d'),
                'sex' => $profile->sex,
                'occupation' => $profile->occupation,
                'qualification' => $profile->qualification,
                'hobbies' => $profile->hobbies,
                'height' => $profile->height,
                'ethnicity' => $profile->ethnicity,
                'religion' => $profile->religion,
                'is_smoker' => $profile->is_smoker,
                'is_drug_user' => $profile->is_drug_user,
                'sexual_orientation' => $profile->sexual_orientation,
            ] : null,
            'images' => $user->media->where('type', 'profile_gallery')->map(function ($media) {
                return $media->url; // Uses the getUrlAttribute accessor (ImageKit)
            })->values()->all(),
            'specs_created_count' => $specsCreated,
            'specs_participated_count' => $specsParticipated,
            'dates_count' => $datesCount,
        ];

        return $this->sendResponse($public, 'Profile retrieved successfully.');
    }
}
