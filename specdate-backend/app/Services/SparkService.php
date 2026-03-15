<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserBalance;
use App\Models\SparkSkin;

class SparkService
{
    /**
     * Initialize user's spark account with default credits and skin.
     *
     * @param User $user
     * @return void
     */
    public function initializeForUser(User $user): void
    {
        // 1. Assign initial credits (single balance; user can buy more via RevenueCat)
        UserBalance::create([
            'user_id' => $user->id,
            'credits' => 3,
        ]);

        // 2. Create Default Skin (Basic Spark)
        SparkSkin::create([
            'user_id' => $user->id,
            'color_hex' => '#0000FF', // Default Blue
            'label' => $user->username,
        ]);
    }

    // Future methods: distinct methods for deducting/adding sparks will go here
}
