<?php

namespace App\Http\Controllers;

use App\Services\ProfileService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Profile\UpdateProfileRequest;

class ProfileController extends Controller
{
    use ApiResponse;

    protected $profileService;

    public function __construct(ProfileService $profileService)
    {
        $this->profileService = $profileService;
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $this->profileService->updateProfile($request->user(), $request->validated());

        return $this->sendResponse($request->user()->load('profile'), 'Profile updated successfully.');
    }
}
