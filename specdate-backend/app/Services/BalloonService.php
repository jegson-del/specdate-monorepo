<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserBalance;
use App\Models\BalloonSkin;

class BalloonService
{
    /**
     * Initialize user's balloon account with default credits and skin.
     *
     * @param User $user
     * @return void
     */
    public function initializeForUser(User $user): void
    {
        // 1. Assign Initial Credits
        UserBalance::create([
            'user_id' => $user->id,
            'red_balloons' => 2,
            'blue_balloons' => 2,
        ]);

        // 2. Create Default Skin
        BalloonSkin::create([
            'user_id' => $user->id,
            'color_hex' => '#0000FF', // Default Blue
            'label' => $user->username,
        ]);
    }

    // Future methods: distinct methods for deducting/adding balloons will go here
}
