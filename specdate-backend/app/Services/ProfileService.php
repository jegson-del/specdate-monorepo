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
    public function updateProfile(User $user, array $data)
    {
        // Filter out null values if we only want to update provided fields,
        // but typically for a "complete profile" form we might want to overwrite.
        // For now, we utilize the mass assignment protection of the model.
        
        // Log for debugging
        Log::info("Updating profile for user: {$user->id}", $data);

        return $user->profile()->update($data);
    }
}
