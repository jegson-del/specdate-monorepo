<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class ProfileService
{
    /**
     * Update the user's profile.
     *
     * @param User $user
     * @param array $data
     * @return mixed
     */
    /**
     * Update the user's profile.
     *
     * @param User $user
     * @param array $data
     * @return mixed
     */
    public function updateProfile(User $user, array $data)
    {
        Log::info("Updating profile for user: {$user->id}", $data);

        $profile = $user->profile;
        if (!$profile) {
             $profile = $user->profile()->create($data);
        } else {
             $profile->update($data);
        }

        // Check if profile is complete and set timestamp
        if ($this->isComplete($profile)) {
            if (!$profile->profile_completed_at) {
                $profile->update(['profile_completed_at' => now()]);
            }
        } else {
            if ($profile->profile_completed_at) {
                $profile->update(['profile_completed_at' => null]);
            }
        }

        return $profile;
    }

    /**
     * Check if the profile is complete (required for spec join, filter, and creation).
     * Includes occupation, qualification, sexual_orientation, hobbies for spec filtering and creation.
     *
     * @param \App\Models\UserProfile $profile
     * @return bool
     */
    public function isComplete($profile)
    {
        // Required strings: identity, location, and fields used for spec filter/creation
        $requiredStrings = [
            'full_name',
            'dob',
            'sex',
            'city',
            'state',
            'country',
            'occupation',
            'qualification',
            'sexual_orientation',
            'hobbies',
        ];

        foreach ($requiredStrings as $field) {
            $value = $profile->$field ?? null;
            if ($value === null) {
                return false;
            }
            if (is_string($value) && trim($value) === '') {
                return false;
            }
        }

        // Lifestyle booleans must be set (false is valid, null is not)
        $requiredBooleans = [
            'is_smoker',
            'is_drug_user',
        ];

        foreach ($requiredBooleans as $field) {
            if ($profile->$field === null) {
                return false;
            }
        }

        return true;
    }
}
