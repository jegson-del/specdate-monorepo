<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Handles account lifecycle: pause, unpause, delete.
 * Single responsibility: account state and deletion only.
 */
class AccountService
{
    /**
     * Pause the user's account. Profile becomes hidden; user can still log in.
     */
    public function pause(Authenticatable $user): void
    {
        $model = $user instanceof User ? $user : User::find($user->getAuthIdentifier());
        if ($model) {
            $model->update(['is_paused' => true]);
        }
    }

    /**
     * Unpause the user's account. Profile becomes visible again.
     */
    public function unpause(Authenticatable $user): void
    {
        $model = $user instanceof User ? $user : User::find($user->getAuthIdentifier());
        if ($model) {
            $model->update(['is_paused' => false]);
        }
    }

    /**
     * Permanently delete the user and related data.
     */
    public function deleteAccount(Authenticatable $user): void
    {
        $model = $user instanceof User ? $user : User::find($user->getAuthIdentifier());
        if ($model) {
            // Revoke all tokens so they cannot be used after delete
            $model->tokens()->delete();
            $model->delete();
        }
    }
}
