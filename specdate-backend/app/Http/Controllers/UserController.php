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
    public function show(Request $request, int $id)
    {
        $user = User::with(['profile', 'media'])->find($id);

        if (!$user) {
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
