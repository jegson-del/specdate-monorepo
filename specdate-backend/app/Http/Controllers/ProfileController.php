<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ProfileService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    use ApiResponse;

    protected $profileService;

    public function __construct(ProfileService $profileService)
    {
        $this->profileService = $profileService;
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'dob' => 'nullable|date',
            'full_name' => 'nullable|string|max:255',
            'sex' => 'nullable|string|max:50',
            'occupation' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'hobbies' => 'nullable|string', // Assuming text/json
            'is_smoker' => 'nullable|boolean',
            'is_drug_user' => 'nullable|boolean',
            'sexual_orientation' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
        ]);

        $this->profileService->updateProfile($request->user(), $validated);

        return $this->sendResponse($request->user()->load('profile'), 'Profile updated successfully.');
    }
}
