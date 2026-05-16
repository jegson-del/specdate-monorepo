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
        if (array_key_exists('username', $data)) {
            $username = trim((string) $data['username']);
            unset($data['username']);

            if ($username !== '' && $username !== $user->username) {
                $user->forceFill([
                    'username' => $username,
                    'name' => $username,
                ])->save();
            }
        }

        if (array_key_exists('country_code', $data) && $data['country_code'] !== null) {
            $data['country_code'] = strtoupper((string) $data['country_code']);
        }

        if (array_key_exists('occupation', $data) && !$this->requiresJobTitle((string) $data['occupation'])) {
            $data['job_title'] = null;
        }

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

        if ($this->requiresJobTitle((string) $profile->occupation) && trim((string) ($profile->job_title ?? '')) === '') {
            return false;
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

    private function requiresJobTitle(string $occupation): bool
    {
        return !in_array(trim($occupation), ['', 'Student', 'Unemployed'], true);
    }
}
